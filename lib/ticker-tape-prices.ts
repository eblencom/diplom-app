import "server-only";

import { sql } from "@/lib/db";

export type TickerTapeRow = {
  ticker: string;
  name: string;
  price_link: string | null;
};

export type TickerTapeItem = {
  ticker: string;
  name: string;
  /** Отформатированная цена для ленты. */
  price: string;
  /** link | moex | none */
  source: "link" | "moex" | "none";
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Ищет цену в HTML страницы Investing/MOEX: span с классом, содержащим `price`.
 */
export function extractPriceFromPriceLinkHtml(html: string): string | null {
  const lower = html.toLowerCase();
  if (lower.includes("just a moment") || lower.includes("_cf_chl_opt")) {
    return null;
  }

  const spanPrice = html.match(
    /<span[^>]*class="[^"]*\bprice\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (spanPrice?.[1]) {
    const inner = spanPrice[1].replace(/<[^>]+>/g, " ");
    const cleaned = decodeHtmlEntities(inner).replace(/\s+/g, " ").trim();
    if (cleaned && /[\d,.]/.test(cleaned)) {
      return cleaned.slice(0, 32);
    }
  }

  const loose = html.match(
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (loose?.[1]) {
    const inner = loose[1].replace(/<[^>]+>/g, " ");
    const cleaned = decodeHtmlEntities(inner).replace(/\s+/g, " ").trim();
    if (cleaned && /[\d,.]/.test(cleaned)) {
      return cleaned.slice(0, 32);
    }
  }

  return null;
}

export async function fetchMoexLastPrice(ticker: string): Promise<number | null> {
  const upper = ticker.trim().toUpperCase();
  const url = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(upper)}.json?iss.meta=off`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    marketdata?: { columns?: string[]; data?: unknown[][] };
  };
  const md = payload.marketdata;
  if (!md?.columns?.length || !md.data?.[0]) {
    return null;
  }
  const cols = md.columns;
  const row = md.data[0] as unknown[];
  const pick = (name: string) => {
    const i = cols.indexOf(name);
    if (i === -1) {
      return null;
    }
    const v = row[i];
    if (v === null || v === undefined) {
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return pick("LAST") ?? pick("LCURRENTPRICE") ?? pick("PREVPRICE");
}

async function priceForRow(row: TickerTapeRow): Promise<TickerTapeItem> {
  const link = row.price_link?.trim();
  if (link) {
    try {
      const response = await fetch(link, {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
      });
      if (response.ok) {
        const html = await response.text();
        const parsed = extractPriceFromPriceLinkHtml(html);
        if (parsed) {
          return { ticker: row.ticker, name: row.name, price: parsed, source: "link" };
        }
      }
    } catch {
      // сеть / блокировка
    }
  }

  const moex = await fetchMoexLastPrice(row.ticker);
  if (moex != null) {
    return {
      ticker: row.ticker,
      name: row.name,
      price: moex.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      source: "moex",
    };
  }

  return { ticker: row.ticker, name: row.name, price: "—", source: "none" };
}

export async function getTickerTapeRows(): Promise<TickerTapeRow[]> {
  const result = await sql<TickerTapeRow>(
    `
      SELECT ticker, name, price_link
      FROM companies
      WHERE price_link IS NOT NULL AND TRIM(price_link) <> ''
      ORDER BY ticker ASC
    `,
  );
  return result.rows;
}

/** Параллельно, но с ограничением одновременных запросов. */
export async function buildTickerTapeItems(
  rows: TickerTapeRow[],
  concurrency = 4,
): Promise<TickerTapeItem[]> {
  const out: TickerTapeItem[] = new Array(rows.length);
  let index = 0;

  async function worker() {
    for (;;) {
      const i = index++;
      if (i >= rows.length) {
        return;
      }
      out[i] = await priceForRow(rows[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, () => worker());
  await Promise.all(workers);
  return out;
}
