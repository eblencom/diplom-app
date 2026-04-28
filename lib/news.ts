import "server-only";

import { sql } from "@/lib/db";
import {
  isCategorySlug,
  tickersMatchingCategory,
  type CategorySlug,
} from "@/lib/company-categories";
import { getFavoritesWhereSql } from "@/lib/news-favorites";
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

export type NewsListFilters = {
  companyId?: number;
  category?: CategorySlug;
  favoritesOnly?: boolean;
};

export type CompanyFilterRow = {
  id: number | string;
  name: string;
  ticker: string;
};

export type NewsPreviewPublic = {
  id: number;
  text: string;
  datetime: Date;
  companyName: string;
  ticker: string;
};

type NewsPreviewRow = {
  id: number | string;
  text: string;
  datetime: Date;
  company_name: string;
  ticker: string;
};

const DEFAULT_PAGE_SIZE = 10;

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function buildNewsWhereClause(filters?: NewsListFilters): {
  clause: string;
  params: unknown[];
  nextIndex: number;
} {
  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (
    filters?.companyId != null &&
    Number.isFinite(filters.companyId) &&
    filters.companyId > 0
  ) {
    parts.push(`n.company_id = $${idx}`);
    params.push(filters.companyId);
    idx += 1;
  }

  if (filters?.category != null && isCategorySlug(filters.category)) {
    const tickers = tickersMatchingCategory(filters.category);
    if (tickers.length === 0) {
      parts.push("FALSE");
    } else {
      parts.push(`c.ticker = ANY($${idx}::text[])`);
      params.push(tickers);
      idx += 1;
    }
  }

  const clause = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";
  return { clause, params, nextIndex: idx };
}

export async function getCompaniesForNewsFilter(): Promise<
  { id: number; name: string; ticker: string }[]
> {
  const result = await sql<CompanyFilterRow>(
    `
      SELECT id, name, ticker
      FROM companies
      ORDER BY name ASC
    `,
  );
  return result.rows.map((row) => ({
    id: normalizeId(row.id),
    name: row.name,
    ticker: row.ticker,
  }));
}

export async function getLatestNewsPreview(limit: number): Promise<NewsPreviewPublic[]> {
  const safe = Math.min(50, Math.max(1, Math.round(limit)));
  const result = await sql<NewsPreviewRow>(
    `
      SELECT n.id,
             n.text,
             n.datetime,
             c.name AS company_name,
             c.ticker
      FROM news n
      INNER JOIN companies c ON c.id = n.company_id
      ORDER BY n.datetime DESC, n.id DESC
      LIMIT $1
    `,
    [safe],
  );
  return result.rows.map((row) => ({
    id: normalizeId(row.id),
    text: row.text,
    datetime: new Date(row.datetime),
    companyName: row.company_name,
    ticker: row.ticker,
  }));
}

export async function getNewsPage(
  pageInput: number,
  pageSize = DEFAULT_PAGE_SIZE,
  userId?: number,
  filters?: NewsListFilters,
): Promise<NewsPageResult> {
  const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;

  let clause: string;
  let whereParams: unknown[];
  let nextIndex: number;

  if (filters?.favoritesOnly === true) {
    if (userId == null || !Number.isFinite(userId) || userId < 1) {
      clause = "WHERE FALSE";
      whereParams = [];
      nextIndex = 1;
    } else {
      const fav = await getFavoritesWhereSql(userId);
      clause = fav.clause;
      whereParams = fav.params;
      nextIndex = fav.nextIndex;
    }
  } else {
    const built = buildNewsWhereClause(filters);
    clause = built.clause;
    whereParams = built.params;
    nextIndex = built.nextIndex;
  }

  const countResult = await sql<CountRow>(
    `
      SELECT COUNT(*)::text AS count
      FROM news n
      INNER JOIN companies c ON c.id = n.company_id
      ${clause}
    `,
    whereParams,
  );
  const totalItems = Number(countResult.rows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const listParams = [...whereParams, pageSize, offset];
  const limitPlaceholder = `$${nextIndex}`;
  const offsetPlaceholder = `$${nextIndex + 1}`;

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
      ${clause}
      ORDER BY n.datetime DESC, n.id DESC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    listParams,
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
      items: baseItems.map((row) => {
        const { pricesPath, ...item } = row;
        void pricesPath;
        return {
          ...item,
          predicts: [],
        };
      }),
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
        profit,
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
