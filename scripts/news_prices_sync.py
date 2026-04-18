#!/usr/bin/env python3
"""
Each run: walk all news rows, merge MOEX TQBR 1m candle closes into company prices JSON.
Skips rows that already have price_before and price_after (when T+lag has passed).

Lag in minutes must match lib/price-after-lag.ts (PRICE_AFTER_LAG_MINUTES).
"""
from __future__ import annotations

import json
import os
import sys
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

# Вторая цена: закрытие минутной свечи, начинающейся в floor(время новости) + этот сдвиг.
PRICE_AFTER_LAG_MINUTES = 60


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
    # "2026-04-18 10:30:00" in MSK
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
    # fallback: last candle with begin <= target
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


def needs_price_sync(
    row: NewsRow,
    existing: dict[str, Any] | None,
    now_msk: datetime,
) -> bool:
    has_before = bool(existing and existing.get("price_before") is not None)
    has_after = bool(existing and existing.get("price_after") is not None)
    pub_msk = to_msk(row.published_at)
    after_target = floor_minute(pub_msk) + timedelta(minutes=PRICE_AFTER_LAG_MINUTES)
    can_have_after = now_msk >= after_target
    if has_before and (has_after or not can_have_after):
        return False
    return True


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

        now_msk = datetime.now(tz=MSK)

        by_ticker: dict[str, list[NewsRow]] = defaultdict(list)
        for row in news_rows:
            ticker = (row.ticker or "").strip().upper()
            if ticker:
                by_ticker[ticker].append(row)

        for ticker, ticker_rows in by_ticker.items():
            company_id = ticker_rows[0].company_id
            rel_path = (ticker_rows[0].prices_path or "").strip() or None
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

            pending: list[NewsRow] = []
            for row in ticker_rows:
                existing = by_id.get(row.news_id)
                if needs_price_sync(row, existing, now_msk):
                    pending.append(row)

            if not pending:
                continue

            bounds_from: list[datetime] = []
            bounds_till: list[datetime] = []
            for row in pending:
                pub_msk = to_msk(row.published_at)
                before_target = floor_minute(pub_msk)
                after_target = before_target + timedelta(minutes=PRICE_AFTER_LAG_MINUTES)
                bounds_from.append(before_target - timedelta(days=1))
                bounds_till.append(after_target + timedelta(days=1))

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
            for row in pending:
                existing = by_id.get(row.news_id)
                pub_msk = to_msk(row.published_at)
                before_target = floor_minute(pub_msk)
                after_target = before_target + timedelta(minutes=PRICE_AFTER_LAG_MINUTES)
                can_have_after = now_msk >= after_target

                has_before = bool(existing and existing.get("price_before") is not None)
                has_after = bool(existing and existing.get("price_after") is not None)

                entry = dict(existing) if existing else {
                    "news_id": row.news_id,
                    "news_datetime": pub_msk.isoformat(),
                    "price_before": None,
                    "price_after": None,
                }
                entry["news_id"] = row.news_id
                entry.setdefault("news_datetime", pub_msk.isoformat())

                changed = False
                if not has_before:
                    pb = close_at_begin(candles, before_target)
                    if pb is not None:
                        entry["price_before"] = pb
                        changed = True

                if can_have_after and not has_after:
                    pa = close_at_begin(candles, after_target)
                    if pa is not None:
                        entry["price_after"] = pa
                        changed = True

                if not changed:
                    continue

                by_id[row.news_id] = entry
                file_changed = True
                log(
                    f"[news-prices-sync] updated {ticker} news_id={row.news_id} "
                    f"price_before={entry.get('price_before')} price_after={entry.get('price_after')}"
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
