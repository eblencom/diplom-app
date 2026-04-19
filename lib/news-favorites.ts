import "server-only";

import { sql } from "@/lib/db";
import {
  isCategorySlug,
  tickersMatchingCategory,
  type CategorySlug,
} from "@/lib/company-categories";

type IdRow = { id: string | number };
type SlugRow = { category_slug: string };

export async function getUserNewsFavoriteCompanyIds(userId: number): Promise<number[]> {
  const r = await sql<IdRow>(
    `SELECT company_id AS id FROM user_favorite_news_companies WHERE user_id = $1 ORDER BY company_id ASC`,
    [userId],
  );
  return r.rows.map((row) => Number(row.id));
}

export async function getUserNewsFavoriteCategorySlugs(userId: number): Promise<CategorySlug[]> {
  const r = await sql<SlugRow>(
    `SELECT category_slug FROM user_favorite_news_categories WHERE user_id = $1 ORDER BY category_slug ASC`,
    [userId],
  );
  const out: CategorySlug[] = [];
  for (const row of r.rows) {
    if (isCategorySlug(row.category_slug)) {
      out.push(row.category_slug);
    }
  }
  return out;
}

/** SQL-фрагмент для списка новостей: компания в избранных ИЛИ тикер попадает в избранные категории. */
export async function getFavoritesWhereSql(userId: number): Promise<{
  clause: string;
  params: unknown[];
  nextIndex: number;
}> {
  const companyIds = await getUserNewsFavoriteCompanyIds(userId);
  const categorySlugs = await getUserNewsFavoriteCategorySlugs(userId);
  const tickers = new Set<string>();
  for (const slug of categorySlugs) {
    for (const t of tickersMatchingCategory(slug)) {
      tickers.add(t);
    }
  }
  const tickerArr = [...tickers];

  if (companyIds.length === 0 && tickerArr.length === 0) {
    return { clause: "WHERE FALSE", params: [], nextIndex: 1 };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (companyIds.length > 0) {
    parts.push(`n.company_id = ANY($${idx}::bigint[])`);
    params.push(companyIds);
    idx += 1;
  }
  if (tickerArr.length > 0) {
    parts.push(`c.ticker = ANY($${idx}::text[])`);
    params.push(tickerArr);
    idx += 1;
  }

  return {
    clause: `WHERE (${parts.join(" OR ")})`,
    params,
    nextIndex: idx,
  };
}

export async function toggleNewsFavoriteCompany(
  userId: number,
  companyId: number,
): Promise<{ favorited: boolean }> {
  if (!Number.isFinite(companyId) || companyId < 1) {
    throw new Error("Invalid company id");
  }

  const del = await sql(
    `DELETE FROM user_favorite_news_companies WHERE user_id = $1 AND company_id = $2`,
    [userId, companyId],
  );
  if ((del.rowCount ?? 0) > 0) {
    return { favorited: false };
  }

  await sql(
    `INSERT INTO user_favorite_news_companies (user_id, company_id) VALUES ($1, $2)`,
    [userId, companyId],
  );
  return { favorited: true };
}

export async function toggleNewsFavoriteCategory(
  userId: number,
  categorySlug: string,
): Promise<{ favorited: boolean }> {
  if (!isCategorySlug(categorySlug)) {
    throw new Error("Invalid category slug");
  }

  const del = await sql(
    `DELETE FROM user_favorite_news_categories WHERE user_id = $1 AND category_slug = $2`,
    [userId, categorySlug],
  );
  if ((del.rowCount ?? 0) > 0) {
    return { favorited: false };
  }

  await sql(
    `INSERT INTO user_favorite_news_categories (user_id, category_slug) VALUES ($1, $2)`,
    [userId, categorySlug],
  );
  return { favorited: true };
}
