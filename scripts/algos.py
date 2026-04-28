from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import psycopg2

WORD_WEIGHT = 0.22
PHRASE_POS_WEIGHT = 3.2
PHRASE_NEG_WEIGHT = 3.8
NEGATED_POS_PENALTY = 0.2
NEGATED_NEG_BONUS = 0.05
SCORE_POS_THRESHOLD = 0.2
SCORE_NEG_THRESHOLD = -0.2
PHRASE_MIN_LEN = 3
FUZZY_SUFFIX_MAX_EXTRA = 5
FUZZY_LEX_MIN_LEN = 5


_morph_analyzer: object | None = None
_morph_unavailable: bool = False


def _get_morph():
    """pymorphy2 опционален: при отсутствии пакета — только точное слово + эвристика."""
    global _morph_analyzer, _morph_unavailable
    if _morph_unavailable:
        return None
    if _morph_analyzer is not None:
        return _morph_analyzer
    try:
        from pymorphy2 import MorphAnalyzer

        _morph_analyzer = MorphAnalyzer()
    except ImportError:
        _morph_unavailable = True
        _morph_analyzer = None
    return _morph_analyzer


def _lemma(morph, token: str) -> str:
    if not morph or len(token) < 2:
        return token
    parsed = morph.parse(token)
    if not parsed:
        return token
    return parsed[0].normal_form


def _build_lemma_index(words: set[str], morph) -> set[str]:
    """Индекс для сопоставления: исходные слова + нормальные формы из лексикона."""
    idx: set[str] = set(words)
    if not morph:
        return idx
    for w in words:
        if len(w) < 2:
            continue
        nf = _lemma(morph, w)
        idx.add(nf)
    return idx


def _word_sentiment_polarity(
    token: str,
    negated: bool,
    pos_words: set[str],
    neg_words: set[str],
    pos_lemmas: set[str],
    neg_lemmas: set[str],
    morph,
) -> int | None:
    """
    +1 позитив, -1 негатив, None нет сигнала.
    Сначала леммы (учёт склонений), затем точное совпадение, затем грубый общий префикс.
    """
    if len(token) < 2:
        return None

    if morph:
        nf = _lemma(morph, token)
        if nf in pos_lemmas and nf not in neg_lemmas:
            return 1
        if nf in neg_lemmas and nf not in pos_lemmas:
            return -1
        if nf in pos_lemmas and nf in neg_lemmas:
            return None

    if token in pos_words and token not in neg_words:
        return 1
    if token in neg_words and token not in pos_words:
        return -1
    if token in pos_words and token in neg_words:
        return None

    if morph is None and len(token) >= FUZZY_LEX_MIN_LEN:
        if _fuzzy_declension_hit(token, pos_words) and not _fuzzy_declension_hit(token, neg_words):
            return 1
        if _fuzzy_declension_hit(token, neg_words) and not _fuzzy_declension_hit(token, pos_words):
            return -1
    return None


def _fuzzy_declension_hit(token: str, lex_words: set[str]) -> bool:
    """Без морфологии: токен — слово из словаря + короткий суффикс склонения (рост→роста)."""
    for w in lex_words:
        if len(w) < FUZZY_LEX_MIN_LEN:
            continue
        if token.startswith(w) and 0 < len(token) - len(w) <= FUZZY_SUFFIX_MAX_EXTRA:
            return True
        if w.startswith(token) and 0 < len(w) - len(token) <= FUZZY_SUFFIX_MAX_EXTRA:
            return True
    return False


def get_project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_database_url() -> str | None:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    env_path = get_project_root() / ".env"
    if not env_path.exists():
        return None

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not stripped.startswith("DATABASE_URL="):
            continue
        return stripped.split("=", 1)[1].strip()

    return None


def normalize_text(s: str) -> str:
    t = s.lower().replace("ё", "е")
    t = re.sub(r"[^0-9a-zа-я\-]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _normalize_phrase_line(p: str) -> str:
    t = p.strip().lower().replace("ё", "е")
    return re.sub(r"\s+", " ", t)


def load_lexicon() -> tuple[set[str], set[str], list[str], list[str]]:
    path = get_project_root() / "data" / "market_lexicon.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    pos_words = {w.lower().replace("ё", "е") for w in doc.get("positive", [])}
    neg_words = {w.lower().replace("ё", "е") for w in doc.get("negative", [])}
    pos_phrases = [str(x) for x in doc.get("positive_phrases", []) if str(x).strip()]
    neg_phrases = [str(x) for x in doc.get("negative_phrases", []) if str(x).strip()]
    if not pos_phrases or not neg_phrases:
        try:
            from lexicon_phrases import NEGATIVE_PHRASES, POSITIVE_PHRASES

            if not pos_phrases:
                pos_phrases = [
                    _normalize_phrase_line(p) for p in POSITIVE_PHRASES if p.strip()
                ]
            if not neg_phrases:
                neg_phrases = [
                    _normalize_phrase_line(p) for p in NEGATIVE_PHRASES if p.strip()
                ]
        except ImportError:
            pass
    return pos_words, neg_words, pos_phrases, neg_phrases


def _apply_phrases(padded: str, phrases: list[str], weight: float) -> tuple[float, str]:
    score = 0.0
    work = padded
    ordered = sorted(
        {p.strip() for p in phrases if len(p.strip()) >= PHRASE_MIN_LEN},
        key=len,
        reverse=True,
    )
    for ph in ordered:
        needle = f" {ph} "
        while needle in work:
            score += weight
            work = work.replace(needle, " ", 1)
    return score, work


def score_sentiment(
    norm: str,
    pos_words: set[str],
    neg_words: set[str],
    pos_phrases: list[str],
    neg_phrases: list[str],
) -> float:
    if not norm:
        return 0.0

    morph = _get_morph()
    pos_lemmas = _build_lemma_index(pos_words, morph)
    neg_lemmas = _build_lemma_index(neg_words, morph)

    padded = f" {norm} "
    score = 0.0

    s_neg, after_neg = _apply_phrases(padded, neg_phrases, -PHRASE_NEG_WEIGHT)
    score += s_neg
    s_pos, after_phrases = _apply_phrases(after_neg, pos_phrases, PHRASE_POS_WEIGHT)
    score += s_pos

    tokens = [t for t in after_phrases.split() if t]
    for i, t in enumerate(tokens):
        if len(t) < 2:
            continue
        negated = i > 0 and tokens[i - 1] == "не"
        pol = _word_sentiment_polarity(
            t, negated, pos_words, neg_words, pos_lemmas, neg_lemmas, morph
        )
        if pol is None:
            continue
        if pol == 1:
            if negated:
                score -= NEGATED_POS_PENALTY
            else:
                score += WORD_WEIGHT
        elif pol == -1:
            if negated:
                score += NEGATED_NEG_BONUS
            else:
                score -= WORD_WEIGHT

    return score


def classify(score: float) -> str:
    if score >= SCORE_POS_THRESHOLD:
        return "positive"
    if score <= SCORE_NEG_THRESHOLD:
        return "negative"
    return "neutral"


def fetch_news_text(news_id: int) -> str:
    database_url = load_database_url()
    if not database_url:
        raise RuntimeError("DATABASE_URL не задан")

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT text FROM news WHERE id = %s", (news_id,))
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"Новость id={news_id} не найдена")
            return row[0] if row[0] is not None else ""
    finally:
        conn.close()


def predict(news_id: int) -> str:
    lex_path = get_project_root() / "data" / "market_lexicon.json"
    if not lex_path.exists():
        return "neutral"

    pos_w, neg_w, pos_p, neg_p = load_lexicon()
    text = fetch_news_text(news_id)
    norm = normalize_text(text)
    if not norm:
        return "neutral"

    s = score_sentiment(norm, pos_w, neg_w, pos_p, neg_p)
    return classify(s)


def main() -> None:
    try:
        news_id = int(sys.argv[1])
    except (IndexError, ValueError):
        print(json.dumps({"prediction": "neutral"}, ensure_ascii=False))
        return

    try:
        pred = predict(news_id)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

    print(json.dumps({"prediction": pred}, ensure_ascii=False))


if __name__ == "__main__":
    main()
