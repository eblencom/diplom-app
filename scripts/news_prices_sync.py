#!/usr/bin/env python3
"""
MOEX TQBR 1m: для строк predicts в status=expect заполняет price_before и price_after
по полю lag_minutes (минуты после минуты новости, MSK, floor).

Дополнительно в JSON компании пишет price_before для новостей (для /api/news/:id/price),
если в файле его ещё нет. price_after в JSON не используется для предсказаний.
"""
from __future__ import annotations

import json
import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import psycopg2
import requests
from psycopg2.extras import RealDictCursor

MSK = ZoneInfo("Europe/Moscow")


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


def log(msg: str) -> None:
    print(msg, flush=True)


def to_msk(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=MSK)
    return dt.astimezone(MSK)


def floor_minute(dt: datetime) -> datetime:
    d = to_msk(dt)
    return d.replace(second=0, microsecond=0)


def moex_begin_to_dt(s: str) -> datetime:
    naive = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    return naive.replace(tzinfo=MSK)


def fetch_candles_1m(ticker: str, day_from: date, day_till: date) -> list[dict[str, Any]]:
    url = (
        "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/"
        f"{ticker}/candles.json"
    )
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        params: dict[str, Any] = {
            "interval": 1,
            "from": day_from.isoformat(),
            "till": day_till.isoformat(),
            "start": start,
        }
        r = requests.get(url, params=params, timeout=45)
        r.raise_for_status()
        payload = r.json()
        block = payload.get("candles")
        if not block:
            break
        cols = block.get("columns") or []
        data = block.get("data") or []
        if not cols or not data:
            break
        ci = {name: idx for idx, name in enumerate(cols)}
        ib = ci.get("begin")
        iclose = ci.get("close")
        if ib is None or iclose is None:
            break
        for row in data:
            begin = row[ib]
            close = row[iclose]
            rows.append({"begin": str(begin), "close": float(close)})

        start += len(data)
        if len(data) == 0:
            break

    dedup: dict[str, float] = {}
    for row in rows:
        dedup[row["begin"]] = row["close"]
    merged = [{"begin": key, "close": value} for key, value in sorted(dedup.items())]
    return merged


def close_at_begin(candles: list[dict[str, Any]], target_begin: datetime) -> float | None:
    key = target_begin.astimezone(MSK).replace(tzinfo=None)
    key_s = key.strftime("%Y-%m-%d %H:%M:%S")
    for c in candles:
        if c["begin"][:19] == key_s[:19]:
            return float(c["close"])
    best: float | None = None
    for c in candles:
        b = moex_begin_to_dt(c["begin"])
        if b <= target_begin:
            best = float(c["close"])
        else:
            break
    return best


def default_prices_path(ticker: str) -> str:
    return str(Path("data") / "prices" / f"{ticker.upper()}.json")


def read_prices_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "items": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "items": []}


def write_prices_file(path: Path, doc: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


@dataclass
class NewsRow:
    news_id: int
    company_id: int
    ticker: str
    prices_path: str | None
    published_at: datetime


@dataclass
class PendingPredict:
    predict_id: int
    news_id: int
    lag_minutes: int
    published_at: datetime
    price_before: float | None
    price_after: float | None
    company_id: int
    ticker: str
    prices_path: str | None


def needs_json_price_before(existing: dict[str, Any] | None) -> bool:
    if not existing:
        return True
    return existing.get("price_before") is None


def main() -> int:
    db_url = load_database_url()
    if not db_url:
        log("[news-prices-sync] DATABASE_URL is not set")
        return 1

    root = get_project_root()
    os.chdir(root)

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT n.id AS news_id,
                       n.company_id,
                       c.ticker,
                       c.prices_path,
                       n.datetime AS published_at
                FROM news n
                INNER JOIN companies c ON c.id = n.company_id
                ORDER BY n.id ASC
                """
            )
            news_rows = [NewsRow(**dict(r)) for r in cur.fetchall()]

            cur.execute(
                """
                SELECT p.id AS predict_id,
                       p.news_id,
                       p.lag_minutes,
                       p.price_before,
                       p.price_after,
                       n.datetime AS published_at,
                       n.company_id,
                       c.ticker,
                       c.prices_path
                FROM predicts p
                INNER JOIN news n ON n.id = p.news_id
                INNER JOIN companies c ON c.id = n.company_id
                WHERE p.status = 'expect'
                  AND (p.price_before IS NULL OR p.price_after IS NULL)
                """
            )
            pending_predicts_raw = cur.fetchall()

        now_msk = datetime.now(tz=MSK)

        by_ticker_news: dict[str, list[NewsRow]] = defaultdict(list)
        for row in news_rows:
            ticker = (row.ticker or "").strip().upper()
            if ticker:
                by_ticker_news[ticker].append(row)

        by_ticker_predicts: dict[str, list[PendingPredict]] = defaultdict(list)
        for r in pending_predicts_raw:
            ticker = (r.get("ticker") or "").strip().upper()
            if not ticker:
                continue
            try:
                lag = int(r["lag_minutes"])
            except (TypeError, ValueError):
                continue
            by_ticker_predicts[ticker].append(
                PendingPredict(
                    predict_id=int(r["predict_id"]),
                    news_id=int(r["news_id"]),
                    lag_minutes=lag,
                    published_at=r["published_at"],
                    price_before=float(r["price_before"])
                    if r.get("price_before") is not None
                    else None,
                    price_after=float(r["price_after"])
                    if r.get("price_after") is not None
                    else None,
                    company_id=int(r["company_id"]),
                    ticker=ticker,
                    prices_path=r.get("prices_path"),
                )
            )

        all_tickers = set(by_ticker_news.keys()) | set(by_ticker_predicts.keys())

        for ticker in sorted(all_tickers):
            ticker_news = by_ticker_news.get(ticker, [])
            ticker_predicts = by_ticker_predicts.get(ticker, [])
            if not ticker_news and not ticker_predicts:
                continue

            company_id = (
                ticker_news[0].company_id
                if ticker_news
                else ticker_predicts[0].company_id
            )
            rel_path: str | None = None
            if ticker_news:
                rel_path = (ticker_news[0].prices_path or "").strip() or None
            if not rel_path and ticker_predicts:
                rel_path = (ticker_predicts[0].prices_path or "").strip() or None
            if not rel_path:
                rel_path = default_prices_path(ticker)
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE companies SET prices_path = %s WHERE id = %s",
                        (rel_path, company_id),
                    )
                conn.commit()

            raw_path = Path(rel_path)
            path = raw_path.resolve() if raw_path.is_absolute() else (root / raw_path).resolve()

            doc = read_prices_file(path)
            items: list[dict[str, Any]] = list(doc.get("items") or [])
            by_id: dict[int, dict[str, Any]] = {}
            for it in items:
                nid = it.get("news_id")
                try:
                    nid_int = int(nid)  # type: ignore[arg-type]
                except (TypeError, ValueError):
                    continue
                by_id[nid_int] = it

            json_news_pending: list[NewsRow] = []
            for row in ticker_news:
                existing = by_id.get(row.news_id)
                if needs_json_price_before(existing):
                    json_news_pending.append(row)

            if not ticker_predicts and not json_news_pending:
                continue

            bounds_from: list[datetime] = []
            bounds_till: list[datetime] = []
            for pp in ticker_predicts:
                pub_msk = to_msk(pp.published_at)
                before_target = floor_minute(pub_msk)
                after_target = before_target + timedelta(minutes=pp.lag_minutes)
                bounds_from.append(before_target - timedelta(days=1))
                bounds_till.append(after_target + timedelta(days=1))
            for row in json_news_pending:
                pub_msk = to_msk(row.published_at)
                before_target = floor_minute(pub_msk)
                bounds_from.append(before_target - timedelta(days=1))
                bounds_till.append(before_target + timedelta(days=1))

            day_from = min(bounds_from).date()
            day_till = max(bounds_till).date()

            try:
                candles = fetch_candles_1m(ticker, day_from, day_till)
            except Exception as exc:  # noqa: BLE001
                log(f"[news-prices-sync] MOEX {ticker}: {exc}")
                continue

            if not candles:
                log(f"[news-prices-sync] MOEX {ticker}: пустые свечи (проверьте тикер / даты)")
                continue

            file_changed = False

            for pp in ticker_predicts:
                pub_msk = to_msk(pp.published_at)
                before_target = floor_minute(pub_msk)
                after_target = before_target + timedelta(minutes=pp.lag_minutes)
                can_have_after = now_msk >= after_target

                pb: float | None = pp.price_before
                if pb is None:
                    got = close_at_begin(candles, before_target)
                    if got is not None:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                UPDATE predicts
                                SET price_before = %s
                                WHERE id = %s AND price_before IS NULL
                                """,
                                (got, pp.predict_id),
                            )
                        conn.commit()
                        pb = got
                        log(
                            f"[news-prices-sync] predict id={pp.predict_id} {ticker} "
                            f"news_id={pp.news_id} price_before={got}"
                        )

                if can_have_after and pp.price_after is None:
                    pa = close_at_begin(candles, after_target)
                    if pa is not None:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                UPDATE predicts
                                SET price_after = %s
                                WHERE id = %s AND price_after IS NULL
                                """,
                                (pa, pp.predict_id),
                            )
                        conn.commit()
                        log(
                            f"[news-prices-sync] predict id={pp.predict_id} {ticker} "
                            f"news_id={pp.news_id} price_after={pa} (lag={pp.lag_minutes}m)"
                        )

                if pb is not None:
                    existing = by_id.get(pp.news_id)
                    entry = dict(existing) if existing else {
                        "news_id": pp.news_id,
                        "news_datetime": pub_msk.isoformat(),
                        "price_before": None,
                        "price_after": None,
                    }
                    entry["news_id"] = pp.news_id
                    entry.setdefault("news_datetime", pub_msk.isoformat())
                    if entry.get("price_before") is None:
                        entry["price_before"] = pb
                        by_id[pp.news_id] = entry
                        file_changed = True

            for row in json_news_pending:
                existing = by_id.get(row.news_id)
                if not needs_json_price_before(existing):
                    continue
                pub_msk = to_msk(row.published_at)
                before_target = floor_minute(pub_msk)
                got = close_at_begin(candles, before_target)
                if got is None:
                    continue
                entry = dict(existing) if existing else {
                    "news_id": row.news_id,
                    "news_datetime": pub_msk.isoformat(),
                    "price_before": None,
                    "price_after": None,
                }
                entry["news_id"] = row.news_id
                entry.setdefault("news_datetime", pub_msk.isoformat())
                entry["price_before"] = got
                by_id[row.news_id] = entry
                file_changed = True
                log(
                    f"[news-prices-sync] json {ticker} news_id={row.news_id} "
                    f"price_before={got}"
                )

            if file_changed:
                doc["version"] = 1
                doc["items"] = sorted(by_id.values(), key=lambda x: int(x["news_id"]))
                write_prices_file(path, doc)
    finally:
        conn.close()

    log("[news-prices-sync] ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
