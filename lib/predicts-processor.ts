import "server-only";

import { sql } from "@/lib/db";
import { computePredictOutcome } from "@/lib/predicts-logic";
import type { PredictionKind } from "@/lib/predicts-types";
import { readPricePairFromFile } from "@/lib/news-prices-file";

type ExpectRow = {
  id: string | number;
  prediction: string;
  news_id: string | number;
  prices_path: string | null;
};

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

export async function closeExpectingPredicts(): Promise<number> {
  const result = await sql<ExpectRow>(
    `
      SELECT
        p.id,
        p.prediction,
        p.news_id,
        c.prices_path
      FROM predicts p
      INNER JOIN news n ON n.id = p.news_id
      INNER JOIN companies c ON c.id = n.company_id
      WHERE p.status = 'expect'
    `,
  );

  let closed = 0;

  for (const row of result.rows) {
    const predictId = normalizeId(row.id);
    const newsId = normalizeId(row.news_id);
    const prediction = row.prediction as PredictionKind;

    const pair = await readPricePairFromFile(row.prices_path, newsId);
    if (!pair) {
      continue;
    }

    const { result: outcome, resultPercent } = computePredictOutcome(
      prediction,
      pair.price_before,
      pair.price_after,
    );

    const updated = await sql(
      `
        UPDATE predicts
        SET status = 'closed',
            result = $1,
            result_percent = $2
        WHERE id = $3 AND status = 'expect'
      `,
      [outcome, resultPercent, predictId],
    );

    if ((updated.rowCount ?? 0) > 0) {
      closed += 1;
    }
  }

  if (closed > 0) {
    console.log(`[predicts-processor] closed ${closed} predict(s)`);
  }

  return closed;
}
