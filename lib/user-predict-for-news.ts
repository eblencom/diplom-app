import "server-only";

import { sql } from "@/lib/db";
import { readPricePairFromFile } from "@/lib/news-prices-file";
import type { PredictionKind, UserPredictOnNews } from "@/lib/predicts-types";

type Row = {
  id: string | number;
  prediction: string;
  status: string;
  result: string | null;
  result_percent: string | null;
  prices_path: string | null;
};

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export async function getUserPredictSnapshotForNews(
  userId: number,
  newsId: number,
): Promise<UserPredictOnNews | null> {
  const result = await sql<Row>(
    `
      SELECT
        p.id,
        p.prediction,
        p.status,
        p.result,
        p.result_percent,
        c.prices_path
      FROM predicts p
      INNER JOIN news n ON n.id = p.news_id
      INNER JOIN companies c ON c.id = n.company_id
      WHERE p.user_id = $1 AND p.news_id = $2
      LIMIT 1
    `,
    [userId, newsId],
  );

  const p = result.rows[0];
  if (!p) {
    return null;
  }

  const prediction = p.prediction as PredictionKind;
  const status = p.status === "closed" ? "closed" : "expect";

  if (status === "expect") {
    return {
      id: normalizeId(p.id),
      prediction,
      status: "expect",
      result: null,
      resultPercent: null,
      priceBefore: null,
      priceAfter: null,
    };
  }

  const pair = await readPricePairFromFile(p.prices_path, newsId);

  return {
    id: normalizeId(p.id),
    prediction,
    status: "closed",
    result: (p.result as UserPredictOnNews["result"]) ?? null,
    resultPercent:
      p.result_percent === null || p.result_percent === undefined
        ? null
        : Number(p.result_percent),
    priceBefore: pair?.price_before ?? null,
    priceAfter: pair?.price_after ?? null,
  };
}
