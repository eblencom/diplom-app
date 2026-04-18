import "server-only";

import { sql } from "@/lib/db";

export type NewsItem = {
  id: number;
  text: string;
  datetime: Date;
  companyId: number;
  companyName: string;
  ticker: string;
};

type NewsRow = {
  id: number | string;
  text: string;
  datetime: Date;
  company_id: number | string;
  company_name: string;
  ticker: string;
};

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
        c.ticker
      FROM news n
      INNER JOIN companies c ON c.id = n.company_id
      ORDER BY n.datetime DESC, n.id DESC
      LIMIT $1
      OFFSET $2
    `,
    [pageSize, offset],
  );

  const items = result.rows.map((row) => ({
    id: normalizeId(row.id),
    text: row.text,
    datetime: new Date(row.datetime),
    companyId: normalizeId(row.company_id),
    companyName: row.company_name,
    ticker: row.ticker,
  }));

  return {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}
