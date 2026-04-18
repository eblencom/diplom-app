import "server-only";

import { readPricePairFromFile } from "@/lib/news-prices-file";
import { clampLagMinutes, DEFAULT_LAG_MINUTES } from "@/lib/predict-lag";
import type { PredictionKind, UserPredictOnNews } from "@/lib/predicts-types";

export type PredictRowFields = {
  id: number | string;
  news_id: number | string;
  prediction: string;
  status: string;
  result: string | null;
  result_percent: string | number | null;
  lag_minutes?: number | string | null;
  price_before?: string | number | null;
  price_after?: string | number | null;
};

function normalizeId(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function rowToUserPredictOnNews(
  row: PredictRowFields,
  pricesPath: string | null,
): Promise<UserPredictOnNews> {
  const id = normalizeId(row.id);
  const newsId = normalizeId(row.news_id);
  const prediction = row.prediction as PredictionKind;
  const status = row.status === "closed" ? "closed" : "expect";
  const lagMinutes =
    row.lag_minutes != null && row.lag_minutes !== ""
      ? clampLagMinutes(Number(row.lag_minutes))
      : DEFAULT_LAG_MINUTES;

  if (status === "expect") {
    return {
      id,
      prediction,
      status: "expect",
      result: null,
      resultPercent: null,
      lagMinutes,
      priceBefore: null,
      priceAfter: null,
    };
  }

  let priceBefore = num(row.price_before);
  let priceAfter = num(row.price_after);
  if ((priceBefore === null || priceAfter === null) && pricesPath) {
    const pair = await readPricePairFromFile(pricesPath, newsId);
    if (pair) {
      priceBefore = priceBefore ?? pair.price_before;
      priceAfter = priceAfter ?? pair.price_after;
    }
  }

  return {
    id,
    prediction,
    status: "closed",
    result: (row.result as UserPredictOnNews["result"]) ?? null,
    resultPercent:
      row.result_percent === null || row.result_percent === undefined
        ? null
        : Number(row.result_percent),
    lagMinutes,
    priceBefore,
    priceAfter,
  };
}
