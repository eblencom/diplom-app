export type PredictionKind = "positive" | "neutral" | "negative";

export type UserPredictOnNews = {
  id: number;
  prediction: PredictionKind;
  status: "expect" | "closed";
  result: "win" | "lose" | "neutral" | null;
  resultPercent: number | null;
  /** Минут после минуты новости (MSK) до второй точки (MOEX 1m). */
  lagMinutes: number;
  priceBefore: number | null;
  priceAfter: number | null;
};
