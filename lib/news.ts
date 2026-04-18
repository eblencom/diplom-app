import "server-only";

import { sql } from "@/lib/db";
import { rowToUserPredictOnNews, type PredictRowFields } from "@/lib/predict-row-to-view";

import type { UserPredictOnNews } from "@/lib/predicts-types";

export type { UserPredictOnNews };

export type NewsItem = {
  id: number;
  text: string;
  datetime: Date;
  companyId: number;
  companyName: string;
  ticker: string;
  predicts: UserPredictOnNews[];
};

type NewsRow = {
  id: number | string;
  text: string;
  datetime: Date;
  company_id: number | string;
  company_name: string;
  ticker: string;
  prices_path: string | null;
};

type PredictRow = PredictRowFields & { news_id: number | string };

type CountRow = {
  count: string;
};

export type NewsPageResult = {
  items: NewsItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 10;

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export async function getNewsPage(
  pageInput: number,
  pageSize = DEFAULT_PAGE_SIZE,
  userId?: number,
): Promise<NewsPageResult> {
  const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;

  const countResult = await sql<CountRow>("SELECT COUNT(*)::text AS count FROM news");
  const totalItems = Number(countResult.rows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const result = await sql<NewsRow>(
    `
      SELECT
        n.id,
        n.text,
        n.datetime,
        c.id AS company_id,
        c.name AS company_name,
        c.ticker,
        c.prices_path
      FROM news n
      INNER JOIN companies c ON c.id = n.company_id
      ORDER BY n.datetime DESC, n.id DESC
      LIMIT $1
      OFFSET $2
    `,
    [pageSize, offset],
  );

  const baseItems = result.rows.map((row) => ({
    id: normalizeId(row.id),
    text: row.text,
    datetime: new Date(row.datetime),
    companyId: normalizeId(row.company_id),
    companyName: row.company_name,
    ticker: row.ticker,
    pricesPath: row.prices_path,
  }));

  if (!userId || baseItems.length === 0) {
    return {
      items: baseItems.map(({ pricesPath: _pricesPath, ...item }) => ({
        ...item,
        predicts: [],
      })),
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  const newsIds = baseItems.map((i) => i.id);
  const predictResult = await sql<PredictRow>(
    `
      SELECT
        id,
        news_id,
        prediction,
        status,
        result,
        result_percent,
        lag_minutes,
        price_before,
        price_after
      FROM predicts
      WHERE user_id = $1 AND news_id = ANY($2::bigint[])
      ORDER BY id ASC
    `,
    [userId, newsIds],
  );

  const predictByNews = new Map<number, PredictRow[]>();
  for (const row of predictResult.rows) {
    const nid = normalizeId(row.news_id);
    const list = predictByNews.get(nid) ?? [];
    list.push(row);
    predictByNews.set(nid, list);
  }

  const items: NewsItem[] = [];

  for (const row of baseItems) {
    const { pricesPath, ...rest } = row;
    const rows = predictByNews.get(rest.id) ?? [];
    const predicts: UserPredictOnNews[] = [];
    for (const p of rows) {
      predicts.push(await rowToUserPredictOnNews(p, pricesPath));
    }
    items.push({ ...rest, predicts });
  }

  return {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}
