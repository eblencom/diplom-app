import "server-only";

import { sql } from "@/lib/db";
import type { UserWinrateStats } from "@/lib/user-winrate-model";

type Row = {
  win: string | number | null;
  lose: string | number | null;
  companies_count: string | number | null;
  news_count: string | number | null;
  predicts_count: string | number | null;
  oldest_news_at: Date | string | null;
};

function toInt(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function getUserWinrateStats(userId: number): Promise<UserWinrateStats> {
  const res = await sql<Row>(
    `
      SELECT
        (SELECT COALESCE(SUM(CASE WHEN result = 'win'  THEN 1 ELSE 0 END), 0)
           FROM predicts WHERE user_id = $1 AND status = 'closed')::bigint AS win,
        (SELECT COALESCE(SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END), 0)
           FROM predicts WHERE user_id = $1 AND status = 'closed')::bigint AS lose,
        (SELECT COUNT(*)::bigint FROM companies) AS companies_count,
        (SELECT COUNT(*)::bigint FROM news) AS news_count,
        (SELECT COUNT(*)::bigint FROM predicts WHERE user_id = $1) AS predicts_count,
        (SELECT MIN(datetime) FROM news) AS oldest_news_at
    `,
    [userId],
  );

  const row = res.rows[0] ?? {
    win: 0,
    lose: 0,
    companies_count: 0,
    news_count: 0,
    predicts_count: 0,
    oldest_news_at: null,
  };
  const win = toInt(row.win);
  const lose = toInt(row.lose);
  const total = win + lose;
  const winrate = total > 0 ? win / total : null;
  const companiesCount = toInt(row.companies_count);
  const newsCount = toInt(row.news_count);
  const predictsCount = toInt(row.predicts_count);

  let oldestNewsAt: string | null = null;
  if (row.oldest_news_at != null) {
    const d = new Date(row.oldest_news_at as string | number | Date);
    oldestNewsAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return {
    win,
    lose,
    total,
    winrate,
    companiesCount,
    newsCount,
    predictsCount,
    oldestNewsAt,
  };
}

