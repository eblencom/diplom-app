import type { PredictionKind } from "@/lib/predicts-types";

export type ResultKind = "win" | "lose" | "neutral";

export type PredictOutcome = {
  result: ResultKind | null;
  resultPercent: number | null;
  profit: number | null;
};

export function computeProfit(result: ResultKind | null, resultPercent: number | null) {
  if (result === "neutral") {
    return 0;
  }

  if (resultPercent === null) {
    return null;
  }

  if (result === "win") {
    return Math.abs(resultPercent);
  }

  if (result === "lose") {
    return -Math.abs(resultPercent);
  }

  return null;
}

export function computePredictOutcome(
  prediction: PredictionKind,
  priceBefore: number,
  priceAfter: number,
): PredictOutcome {
  if (prediction === "neutral") {
    return { result: null, resultPercent: null, profit: null };
  }

  if (!Number.isFinite(priceBefore) || !Number.isFinite(priceAfter)) {
    return { result: null, resultPercent: null, profit: null };
  }

  const pct = priceBefore === 0 ? 0 : ((priceAfter - priceBefore) / priceBefore) * 100;
  const rounded = Math.round(pct * 100) / 100;
  const withProfit = (result: ResultKind, resultPercent: number) => ({
    result,
    resultPercent,
    profit: computeProfit(result, resultPercent),
  });

  if (priceBefore === priceAfter) {
    return withProfit("neutral", 0);
  }

  if (prediction === "positive") {
    return withProfit(priceAfter > priceBefore ? "win" : "lose", rounded);
  }

  return withProfit(priceAfter < priceBefore ? "win" : "lose", rounded);
}
