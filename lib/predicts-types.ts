export type PredictionKind = "positive" | "neutral" | "negative";

export type UserPredictOnNews = {
  id: number;
  prediction: PredictionKind;
  status: "expect" | "closed";
  result: "win" | "lose" | "neutral" | null;
  resultPercent: number | null;
  priceBefore: number | null;
  priceAfter: number | null;
};
