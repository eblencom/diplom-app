import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo
from urllib.parse import urljoin

import cloudscraper
import psycopg2
import requests
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor


DEFAULT_MIN_DATETIME = datetime(2026, 3, 25, 0, 0, 0)
DATE_PATTERN = re.compile(r"(\d{2}\.\d{2}\.\d{4})(?:,|\s)+(\d{2}:\d{2})")
DATE_ONLY_PATTERN = re.compile(r"(\d{2}\.\d{2}\.\d{4})")
MAX_PAGES_PER_COMPANY = 50


@dataclass
class ParsedNews:
    company_id: int
    ticker: str
    article_url: str
    text: str
    published_at: datetime


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


def get_log_path() -> Path:
    configured = os.getenv("NEWS_PARSER_LOG_PATH")
    if configured:
        return Path(configured)
    return get_project_root() / "news_parser_log.txt"


def write_log(message: str) -> None:
    log_path = get_log_path()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with log_path.open("a", encoding="utf-8") as file:
        file.write(f"[{timestamp}] {message}\n")


def parse_datetime_from_article(soup: BeautifulSoup) -> datetime | None:
    blocks = soup.select("div.flex.flex-row.items-center")
    for block in blocks:
        span = block.find("span")
        if not span:
            continue

        text = span.get_text(" ", strip=True)
        match = DATE_PATTERN.search(text)
        if match:
            combined = f"{match.group(1)} {match.group(2)}"
            try:
                return datetime.strptime(combined, "%d.%m.%Y %H:%M")
            except ValueError:
                continue

        date_only_match = DATE_ONLY_PATTERN.search(text)
        if date_only_match:
            try:
                return datetime.strptime(date_only_match.group(1), "%d.%m.%Y")
            except ValueError:
                continue

    meta_node = soup.find("meta", {"property": "article:published_time"})
    if meta_node and meta_node.get("content"):
        raw = str(meta_node.get("content"))
        try:
            aware = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if aware.tzinfo is None:
                aware = aware.replace(tzinfo=ZoneInfo("UTC"))
            msk = aware.astimezone(ZoneInfo("Europe/Moscow"))
            return msk.replace(tzinfo=None)
        except ValueError:
            pass

    return None


def parse_text_from_article(soup: BeautifulSoup) -> str | None:
    selectors = (
        "div.article_WYSIWYG__O0uhw.article_articlePage__UMz3q",
        'div[class*="article_WYSIWYG"]',
        'div[class*="article_articlePage"]',
        "article div[data-testid='article-content']",
    )
    content = None
    for selector in selectors:
        content = soup.select_one(selector)
        if content is not None:
            break
    if content is None:
        return None

    first_div = content.find("div", recursive=False)
    source_root = first_div if first_div is not None else content
    source_paragraphs = source_root.find_all("p")
    if not source_paragraphs:
        source_paragraphs = content.find_all("p")

    paragraphs: list[str] = []
    for paragraph in source_paragraphs:
        if paragraph.find_parent("button"):
            continue

        class_chain = " ".join(paragraph.get("class") or []).lower()
        if "cta" in class_chain:
            continue

        text = paragraph.get_text(" ", strip=True)
        if not text:
            continue

        lowered = text.lower()
        if "подпиш" in lowered and "investing" in lowered:
            continue

        paragraphs.append(text)

    if not paragraphs:
        return None

    return "\n\n".join(paragraphs)


def _is_cloudflare_challenge(html: str) -> bool:
    if not html:
        return False
    lowered = html.lower()
    return (
        "just a moment" in lowered
        or "_cf_chl_opt" in html
        or "cf-challenge" in lowered
        or "checking your browser" in lowered
    )


def _fetch_delay_seconds() -> float:
    raw = os.getenv("NEWS_PARSER_DELAY_MS", "").strip()
    if not raw:
        return 0.0
    try:
        return max(0.0, float(raw) / 1000.0)
    except ValueError:
        return 0.0


def _sleep_between_requests() -> None:
    delay = _fetch_delay_seconds()
    if delay > 0:
        time.sleep(delay)


def fetch_html_via_flaresolverr(url: str) -> str | None:
    endpoint = os.getenv("FLARESOLVERR_URL", "").strip()
    if not endpoint:
        return None

    payload: dict[str, Any] = {
        "cmd": "request.get",
        "url": url,
        "maxTimeout": int(os.getenv("FLARESOLVERR_MAX_TIMEOUT_MS", "120000")),
    }
    session_id = os.getenv("FLARESOLVERR_SESSION", "").strip()
    if session_id:
        payload["session"] = session_id

    try:
        response = requests.post(endpoint, json=payload, timeout=130)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError) as error:
        write_log(f"FlareSolverr: ошибка запроса для {url}: {error}")
        return None

    if data.get("status") != "ok":
        write_log(f"FlareSolverr: статус не ok для {url}: {data.get('message', data)}")
        return None

    solution = data.get("solution") or {}
    html = str(solution.get("response") or "")
    if not html.strip():
        write_log(f"FlareSolverr: пустой ответ для {url}")
        return None

    if _is_cloudflare_challenge(html):
        write_log(f"FlareSolverr: в ответе всё ещё страница challenge для {url}")
        return None

    return html


def fetch_html_with_curl_cffi(url: str) -> str | None:
    try:
        from curl_cffi import requests as curl_requests
    except ImportError:
        return None

    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://ru.investing.com/",
    }
    impersonates = (
        "chrome131",
        "chrome124",
        "chrome120",
        "chrome110",
    )
    for impersonate in impersonates:
        try:
            response = curl_requests.get(
                url,
                impersonate=impersonate,
                headers=headers,
                timeout=35,
            )
            if response.status_code != 200:
                body = response.text or ""
                if _is_cloudflare_challenge(body):
                    write_log(
                        f"curl_cffi {impersonate}: HTTP {response.status_code} + "
                        f"Cloudflare challenge для {url}"
                    )
                else:
                    write_log(
                        f"curl_cffi {impersonate}: HTTP {response.status_code} для {url}"
                    )
                continue
            if _is_cloudflare_challenge(response.text):
                write_log(
                    f"curl_cffi {impersonate}: Cloudflare challenge (нужен "
                    f"FLARESOLVERR_URL или другой IP) для {url}"
                )
                continue
            return response.text
        except Exception as error:
            write_log(f"curl_cffi {impersonate} для {url}: {error}")
    return None


def fetch_html_with_cloudscraper(url: str) -> str | None:
    try:
        scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        response = scraper.get(
            url,
            timeout=35,
            headers={
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://ru.investing.com/",
            },
        )
        response.raise_for_status()
    except requests.RequestException as error:
        write_log(f"cloudscraper: ошибка загрузки {url}: {error}")
        return None

    if _is_cloudflare_challenge(response.text):
        write_log(
            "cloudscraper: ответ — страница Cloudflare challenge. "
            "Задайте FLARESOLVERR_URL (FlareSolverr) или используйте резидентный "
            f"прокси. URL: {url}"
        )
        return None

    return response.text


def fetch_html(url: str) -> BeautifulSoup | None:
    _sleep_between_requests()

    steps: list[tuple[str, Any]] = [
        ("curl_cffi", fetch_html_with_curl_cffi),
        ("cloudscraper", fetch_html_with_cloudscraper),
    ]
    if os.getenv("FLARESOLVERR_URL", "").strip():
        steps.insert(0, ("FlareSolverr", fetch_html_via_flaresolverr))

    for _label, getter in steps:
        raw = getter(url)
        if raw:
            return BeautifulSoup(raw, "html.parser")

    write_log(f"Не удалось получить HTML (все способы): {url}")
    return None


def next_page_url(url: str) -> str | None:
    match = re.search(r"(\d+)(?!.*\d)", url)
    if not match:
        return None

    start, end = match.span(1)
    current = int(match.group(1))
    updated = str(current + 1)
    return f"{url[:start]}{updated}{url[end:]}"


def get_latest_news_datetime(cursor: RealDictCursor, company_id: int) -> datetime:
    cursor.execute(
        "SELECT MAX(datetime) AS latest_datetime FROM news WHERE company_id = %s",
        (company_id,),
    )
    row = cursor.fetchone()
    latest = row["latest_datetime"] if row else None
    return latest if latest else DEFAULT_MIN_DATETIME


def insert_news_if_new(cursor: RealDictCursor, item: ParsedNews) -> bool:
    cursor.execute(
        """
        SELECT id, text
        FROM news
        WHERE company_id = %s
          AND datetime = %s
        LIMIT 1
        """,
        (item.company_id, item.published_at),
    )
    existing = cursor.fetchone()
    if existing:
        existing_text = str(existing.get("text") or "")
        should_update = len(item.text) > len(existing_text)
        if should_update:
            cursor.execute(
                """
                UPDATE news
                SET text = %s
                WHERE id = %s
                """,
                (item.text, existing["id"]),
            )
        return False

    cursor.execute(
        """
        INSERT INTO news (company_id, text, datetime)
        VALUES (%s, %s, %s)
        """,
        (item.company_id, item.text, item.published_at),
    )
    return True


def collect_company_news(
    cursor: RealDictCursor, company: dict[str, Any]
) -> list[ParsedNews]:
    company_id = int(company["id"])
    ticker = str(company["ticker"])
    news_link = str(company["news_link"])
    latest_datetime = get_latest_news_datetime(cursor, company_id)

    candidates: list[ParsedNews] = []
    seen_article_urls: set[str] = set()
    current_page_url = news_link

    for _ in range(MAX_PAGES_PER_COMPANY):
        listing_soup = fetch_html(current_page_url)
        if listing_soup is None:
            break

        link_nodes = listing_soup.select(
            "a.article-title-link, "
            "a.block.text-base.font-bold.leading-5.hover\\:underline, "
            "a[href*='/news/'][href*='article-']"
        )
        if not link_nodes:
            break

        page_has_parsed_datetime = False
        reached_cutoff_datetime = False

        for node in link_nodes:
            href = node.get("href")
            if not href:
                continue
            if "#comments" in href:
                continue
            if "/news/" not in href:
                continue
            if "article-" not in href:
                continue

            article_url = urljoin(current_page_url, href)
            if article_url in seen_article_urls:
                continue
            seen_article_urls.add(article_url)

            article_soup = fetch_html(article_url)
            if article_soup is None:
                continue

            published_at = parse_datetime_from_article(article_soup)
            if published_at is None:
                continue

            page_has_parsed_datetime = True

            if published_at <= latest_datetime:
                reached_cutoff_datetime = True
                continue

            text = parse_text_from_article(article_soup)
            if not text:
                continue

            candidates.append(
                ParsedNews(
                    company_id=company_id,
                    ticker=ticker,
                    article_url=article_url,
                    text=text,
                    published_at=published_at,
                )
            )

        if reached_cutoff_datetime:
            break

        next_url = next_page_url(current_page_url)
        if not next_url:
            if not page_has_parsed_datetime:
                write_log(
                    "Не удалось найти дату публикации и перейти на следующую "
                    f"страницу для company_id={company_id}, ticker={ticker}, "
                    f"url={current_page_url}"
                )
            break

        current_page_url = next_url

    candidates.sort(key=lambda item: item.published_at)
    return candidates


def run_parser() -> dict[str, Any]:
    database_url = load_database_url()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")

    report: dict[str, Any] = {
        "started_at": datetime.now().isoformat(),
        "companies_total": 0,
        "companies_with_news_link": 0,
        "processed_companies": 0,
        "saved_news": 0,
        "saved_items": [],
    }

    connection = psycopg2.connect(database_url)
    connection.autocommit = False

    try:
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM companies
            """
        )
        total_row = cursor.fetchone()
        report["companies_total"] = int(total_row["count"]) if total_row else 0

        cursor.execute(
            """
            SELECT id, ticker, news_link
            FROM companies
            WHERE news_link IS NOT NULL
              AND news_link <> ''
            ORDER BY id
            """
        )
        companies = cursor.fetchall()
        report["companies_with_news_link"] = len(companies)

        for company in companies:
            report["processed_companies"] += 1
            parsed_news = collect_company_news(cursor, company)

            for item in parsed_news:
                inserted = insert_news_if_new(cursor, item)
                if not inserted:
                    continue

                report["saved_news"] += 1
                report["saved_items"].append(
                    {
                        "company_id": item.company_id,
                        "ticker": item.ticker,
                        "datetime": item.published_at.strftime("%Y-%m-%d %H:%M:%S"),
                        "article_url": item.article_url,
                    }
                )

        connection.commit()
        report["finished_at"] = datetime.now().isoformat()
        return report
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main() -> int:
    try:
        # glavniy progon parsera
        report = run_parser()
        write_log(
            "Парсер завершен. Компаний всего: "
            f"{report['companies_total']}, "
            f"с news_link: {report['companies_with_news_link']}, "
            f"обработано: {report['processed_companies']}, "
            f"сохранено новостей: {report['saved_news']}"
        )

        for item in report["saved_items"]:
            write_log(
                "Сохранена новость: "
                f"company_id={item['company_id']} ticker={item['ticker']} "
                f"datetime={item['datetime']} url={item['article_url']}"
            )

        print(json.dumps(report, ensure_ascii=False))
        return 0
    except Exception as error:
        # esli upali to log + stderr i kod 1
        write_log(f"Ошибка парсера: {error}")
        print(
            json.dumps(
                {"error": str(error), "finished_at": datetime.now().isoformat()},
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
