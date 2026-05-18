import "server-only";

import { sql } from "@/lib/db";
import { isCategorySlug, type CategorySlug } from "@/lib/company-categories";

export const PREFERENCE_KIND = {
  TICKER_ALERT: "ticker_alert",
  NEWS_FAV_COMPANY: "news_fav_company",
  NEWS_FAV_CATEGORY: "news_fav_category",
} as const;

export async function getTickerAlertCompanyIds(userId: number): Promise<number[]> {
  const result = await sql<{ company_id: string | number }>(
    `
      SELECT company_id
      FROM user_preference_items
      WHERE user_id = $1 AND kind = $2
      ORDER BY company_id ASC
    `,
    [userId, PREFERENCE_KIND.TICKER_ALERT],
  );
  return result.rows.map((r) => Number(r.company_id));
}

export async function setTickerAlertCompanyIds(userId: number, companyIds: number[]): Promise<void> {
  const unique = [...new Set(companyIds)].filter((id) => Number.isFinite(id) && id > 0);
  if (unique.length === 0) {
    await sql(`DELETE FROM user_preference_items WHERE user_id = $1 AND kind = $2`, [
      userId,
      PREFERENCE_KIND.TICKER_ALERT,
    ]);
    return;
  }

  const valid = await sql<{ id: string | number }>(
    `
      SELECT id FROM companies WHERE id = ANY($1::bigint[])
    `,
    [unique],
  );
  const allowed = new Set(valid.rows.map((r) => Number(r.id)));
  const filtered = unique.filter((id) => allowed.has(id));

  await sql(`DELETE FROM user_preference_items WHERE user_id = $1 AND kind = $2`, [
    userId,
    PREFERENCE_KIND.TICKER_ALERT,
  ]);
  if (filtered.length === 0) {
    return;
  }

  await sql(
    `
      INSERT INTO user_preference_items (user_id, kind, company_id, category_slug)
      SELECT $1::bigint, $2::varchar, x, NULL
      FROM unnest($3::bigint[]) AS x
    `,
    [userId, PREFERENCE_KIND.TICKER_ALERT, filtered],
  );
}

export async function getNewsFavoriteCompanyIds(userId: number): Promise<number[]> {
  const r = await sql<{ id: string | number }>(
    `
      SELECT company_id AS id
      FROM user_preference_items
      WHERE user_id = $1 AND kind = $2
      ORDER BY company_id ASC
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_COMPANY],
  );
  return r.rows.map((row) => Number(row.id));
}

export async function getNewsFavoriteCategorySlugs(userId: number): Promise<CategorySlug[]> {
  const r = await sql<{ category_slug: string }>(
    `
      SELECT category_slug
      FROM user_preference_items
      WHERE user_id = $1 AND kind = $2
      ORDER BY category_slug ASC
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_CATEGORY],
  );
  const out: CategorySlug[] = [];
  for (const row of r.rows) {
    if (isCategorySlug(row.category_slug)) {
      out.push(row.category_slug);
    }
  }
  return out;
}

export async function getFavoritesWhereSql(userId: number): Promise<{
  clause: string;
  params: unknown[];
  nextIndex: number;
}> {
  const companyIds = await getNewsFavoriteCompanyIds(userId);
  const categorySlugs = await getNewsFavoriteCategorySlugs(userId);

  if (companyIds.length === 0 && categorySlugs.length === 0) {
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
  if (categorySlugs.length > 0) {
    parts.push(`c.category_slugs && $${idx}::text[]`);
    params.push(categorySlugs);
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
    `
      DELETE FROM user_preference_items
      WHERE user_id = $1 AND kind = $2 AND company_id = $3
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_COMPANY, companyId],
  );
  if ((del.rowCount ?? 0) > 0) {
    return { favorited: false };
  }

  await sql(
    `
      INSERT INTO user_preference_items (user_id, kind, company_id, category_slug)
      VALUES ($1, $2, $3, NULL)
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_COMPANY, companyId],
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
    `
      DELETE FROM user_preference_items
      WHERE user_id = $1 AND kind = $2 AND category_slug = $3
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_CATEGORY, categorySlug],
  );
  if ((del.rowCount ?? 0) > 0) {
    return { favorited: false };
  }

  await sql(
    `
      INSERT INTO user_preference_items (user_id, kind, company_id, category_slug)
      VALUES ($1, $2, NULL, $3)
    `,
    [userId, PREFERENCE_KIND.NEWS_FAV_CATEGORY, categorySlug],
  );
  return { favorited: true };
}
