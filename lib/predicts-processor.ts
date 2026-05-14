import "server-only";

import { sql } from "@/lib/db";
import { computePredictOutcome } from "@/lib/predicts-logic";
import type { PredictionKind } from "@/lib/predicts-types";
type ExpectRow = {
  id: string | number;
  prediction: string;
  price_before: string | number | null;
  price_after: string | number | null;
};

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function numberOrNaN(value: string | number | null) {
  if (value === null || value === undefined) {
    return NaN;
  }

  return typeof value === "number" ? value : Number(value);
}

// zakrytie statusa expect: est' price_before i price_after — schitaem result, result_percent, profit
export async function closeExpectingPredicts(): Promise<number> {
  const result = await sql<ExpectRow>(
    `
      SELECT
        p.id,
        p.prediction,
        p.price_before,
        p.price_after
      FROM predicts p
      WHERE p.status = 'expect'
        AND p.price_before IS NOT NULL
        AND p.price_after IS NOT NULL
    `,
  );

  let closed = 0;

  for (const row of result.rows) {
    const predictId = normalizeId(row.id);
    const prediction = row.prediction as PredictionKind;

    const before = numberOrNaN(row.price_before);
    const after = numberOrNaN(row.price_after);
    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      continue;
    }

    const { result: outcome, resultPercent, profit } = computePredictOutcome(
      prediction,
      before,
      after,
    );

    const updated = await sql(
      `
        UPDATE predicts
        SET status = 'closed',
            result = $1,
            result_percent = $2,
            profit = $3
        WHERE id = $4 AND status = 'expect'
      `,
      [outcome, resultPercent, profit, predictId],
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
