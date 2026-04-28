import "server-only";

import { sql } from "@/lib/db";
import { rowToUserPredictOnNews, type PredictRowFields } from "@/lib/predict-row-to-view";
import type { UserPredictOnNews } from "@/lib/predicts-types";

type Row = PredictRowFields & { prices_path: string | null };

export async function getUserPredictsForNews(
  userId: number,
  newsId: number,
): Promise<UserPredictOnNews[]> {
  const result = await sql<Row>(
    `
      SELECT
        p.id,
        p.news_id,
        p.prediction,
        p.status,
        p.result,
        p.result_percent,
        p.profit,
        p.lag_minutes,
        p.price_before,
        p.price_after,
        c.prices_path
      FROM predicts p
      INNER JOIN news n ON n.id = p.news_id
      INNER JOIN companies c ON c.id = n.company_id
      WHERE p.user_id = $1 AND p.news_id = $2
      ORDER BY p.id DESC
    `,
    [userId, newsId],
  );

  const out: UserPredictOnNews[] = [];
  for (const p of result.rows) {
    const { prices_path: pricesPath, ...rest } = p;
    out.push(await rowToUserPredictOnNews(rest, pricesPath));
  }
  return out;
}
