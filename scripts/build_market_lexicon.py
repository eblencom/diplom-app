from __future__ import annotations

import json
import re
import urllib.request
from collections import Counter
from pathlib import Path

from lexicon_phrases import NEGATIVE_PHRASES, POSITIVE_PHRASES

URL_POS = "https://raw.githubusercontent.com/kotelnikov-ev/SentiRusColl/master/SentiRusColl_pos.txt"
URL_NEG = "https://raw.githubusercontent.com/kotelnikov-ev/SentiRusColl/master/SentiRusColl_neg.txt"

RU_STOPWORDS = """
и в во не что он на я с со как а то все она так его но да ты к из у за
бы по только ей было вам бывает весь соотв соответственно при без до
это мы её ещё уже вот этот том более уже же ли либо раз два три
который который куда откуда где когда пока после до если хотя потому
чтобы либо или ни будут был была были быть есть им ему них них
""".split()

TARGET = 1000
TOKEN_RE = re.compile(r"[а-яёА-ЯЁa-zA-Z\-]+", re.UNICODE)


def _normalize_phrase(s: str) -> str:
    t = s.strip().lower().replace("ё", "е")
    t = re.sub(r"\s+", " ", t)
    return t

EXTRA_POS = """
рост выручка прибыль дивиденд buyback байбек инвестиции контракт сделка расширение
модернизация запуск рекорд укрепление оптимизм лидерство инновация эффективность
стабильность диверсификация масштабирование соглашение партнёрство капитализация ликвидность
спрос премия премирование акционер акции котировка биржа мосбиржа тикер бумага лот
апгрейд апдейд прогноз позитивный оптимистичный устойчивый перспективный масштабный
сильный уверенный рентабельный привлекательный конкурентоспособный технологичный экологичный
санкционоустойчивый импортозамещение локализация субсидия господдержка кредитование рефинансирование
IPO SPO размещение андеррайтинг листинг индекс бумагодатель денежный поток маржа ebitda
операционная чистая маржинальность драйвер катализатор импульс ралли отскок
консолидация накопление поддержка пробой вверх бычий лонг покупка позиция
повышение рейтинга аутперформ консенсус превышение ожиданий guidance
докупка рекомендация покупать аккумуляция приток инвестор доверие прозрачность
долгосрочный среднесрочный целевой ориентир овершут апсайд синергия эскалация позитивная
тендер победа выигрыш контрактование поставка экспорт импорт квота квоты лицензия
лицензирование сертификация аккредитация рейтинговый апгрейд бенчмарк лидер рынка
доминирование сегменте окно возможностей точка роста драйверы роста исторический максимум
рекордный уровень устойчивый спрос премиальный сегмент премиальность cash-flow кэш-флоу
свободный денежный поток рентабельность маржа ebit маржинальность по ebitda
""".split()

EXTRA_NEG = """
падение снижение убыток убытки дефолт банкротство ликвидация санкции блокировка ограничение
риск волатильность коррекция разворот вниз медвежий шорт продажа давление отток оттоки
иск штраф претензия расследование задержка срыв недовыполнение пересмотр вниз
даунгрейд понижение рейтинга недобор недопоставка простой авария утечка
инфляция стагнация рецессия девальвация обесценение списание резерв просадка пролив
маржин-колл delisting делистинг заморозка эмбарго
негативный пессимистичный токсичный убыточный долговой перегруженность реструктуризация
сокращение увольнение отмена разрыв контракта
нарушение штрафные эмитент техдефолт форс-мажор неплатёж
недостача недостоверность манипуляции расследование цб дисквалификация отзыв лицензии
ограничение операций заморозка активов арест счетов блокировка счетов отток капитала
отток клиентов репутационный репутационные потери убыток курсовой убыток переоценки
обвал обвинение подозрение мошенничество схема дефолтный технический дефолт
реструктуризация долга списание долгов невыплата невыплаты просрочка просрочки
коллектор коллекторское взыскание банкротный надзор отрицательный free-float сжатие
сжатие маржи снижение прогноза снижение оценки снижение целевой цены
""".split()


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "diplom-app-lexicon-build/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
    return raw.decode("utf-8-sig", errors="replace")


def tokens_from_lines(text: str, stop: set[str]) -> Counter[str]:
    cnt: Counter[str] = Counter()
    for line in text.splitlines():
        for m in TOKEN_RE.finditer(line):
            t = m.group(0).lower()
            if len(t) < 3 or t in stop:
                continue
            cnt[t] += 1
    return cnt


def pick_mixed(counter: Counter[str], extra: list[str], stop: set[str], limit: int) -> list[str]:
    """Сначала доменные токены, затем пополнение из коллокаций по частоте."""
    seen: set[str] = set()
    ordered: list[str] = []
    for w in extra:
        wl = w.strip().lower()
        if len(wl) < 2 or wl in stop or wl in seen:
            continue
        seen.add(wl)
        ordered.append(wl)
        if len(ordered) >= limit:
            return ordered[:limit]
    for word, _ in counter.most_common():
        if word in seen:
            continue
        seen.add(word)
        ordered.append(word)
        if len(ordered) >= limit:
            break
    return ordered[:limit]


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    out_path = root / "data" / "market_lexicon.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print("Downloading SentiRusColl...", flush=True)
    pos_text = fetch_text(URL_POS)
    neg_text = fetch_text(URL_NEG)
    stop = {w.lower() for w in RU_STOPWORDS if len(w) >= 2}

    pos_cnt = tokens_from_lines(pos_text, stop)
    neg_cnt = tokens_from_lines(neg_text, stop)

    positive = pick_mixed(pos_cnt, EXTRA_POS, stop, TARGET)
    negative = pick_mixed(neg_cnt, EXTRA_NEG, stop, TARGET)

    positive_phrases = list(
        dict.fromkeys(_normalize_phrase(p) for p in POSITIVE_PHRASES if p.strip()),
    )
    negative_phrases = list(
        dict.fromkeys(_normalize_phrase(p) for p in NEGATIVE_PHRASES if p.strip()),
    )

    doc = {
        "version": 2,
        "target_size": TARGET,
        "positive": positive,
        "negative": negative,
        "positive_phrases": positive_phrases,
        "negative_phrases": negative_phrases,
        "meta": {
            "sources": [
                "SentiRusColl (Kotelnikova A.V., Kotelnikov E.V., AINL-2019)",
                "domain extras (hand-picked finance/market tokens)",
                "scripts/lexicon_phrases.py (multi-word patterns)",
            ],
            "positive_count": len(positive),
            "negative_count": len(negative),
            "positive_phrase_count": len(positive_phrases),
            "negative_phrase_count": len(negative_phrases),
        },
    }
    out_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Wrote {out_path} (+{len(positive)} / -{len(negative)}, "
        f"phrases +{len(positive_phrases)} / -{len(negative_phrases)})",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
