import type { PredictionKind } from "@/lib/predicts-types";

export type ResultKind = "win" | "lose" | "neutral";

export function computePredictOutcome(
  prediction: PredictionKind,
  priceBefore: number,
  priceAfter: number,
): { result: ResultKind | null; resultPercent: number | null } {
  if (prediction === "neutral") {
    return { result: null, resultPercent: null };
  }

  if (!Number.isFinite(priceBefore) || !Number.isFinite(priceAfter)) {
    return { result: null, resultPercent: null };
  }

  const pct = priceBefore === 0 ? 0 : ((priceAfter - priceBefore) / priceBefore) * 100;
  const rounded = Math.round(pct * 100) / 100;

  if (priceBefore === priceAfter) {
    return { result: "neutral", resultPercent: 0 };
  }

  if (prediction === "positive") {
    return {
      result: priceAfter > priceBefore ? "win" : "lose",
      resultPercent: rounded,
    };
  }

  return {
    result: priceAfter < priceBefore ? "win" : "lose",
    resultPercent: rounded,
  };
}
