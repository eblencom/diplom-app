export type DashboardDayPoint = {
  date: string;
  /** Доля win среди win+lose за день, null если нет закрытых win/lose */
  winrate: number | null;
  /** Закрытых предсказаний за день (по дате новости) */
  predictions: number;
  /** Новостей с такой датой публикации */
  newsCount: number;
  /** Сумма result_percent за день */
  sumResultPercent: number;
  /** Накопительная сумма result_percent по дням до этого дня включительно */
  cumulativeResultPercent: number;
};

/** Сколько раз в интервале делалось предсказание по новостям компании (строки predicts). */
export type DashboardCompanyPredictCount = {
  ticker: string;
  name: string;
  count: number;
};

/** Закрытые предсказания с этим lag_minutes дали максимум Σ result_percent в интервале */
export type DashboardBestProfitLag = {
  lagMinutes: number;
  /** Сумма result_percent по закрытым на этом горизонте */
  sumResultPercent: number;
  closedCount: number;
};

export type DashboardStatsPayload = {
  from: string;
  to: string;
  scope: "user" | "all";
  win: number;
  lose: number;
  /** win / (win+lose) за весь интервал */
  weightedWinrate: number | null;
  /** Сумма всех result_percent по закрытым предсказаниям в интервале */
  totalResultPercentSum: number;
  days: DashboardDayPoint[];
  /** По убыванию count */
  companyPredictCounts: DashboardCompanyPredictCount[];
  /** null, если нет закрытых с result_percent */
  bestProfitLag: DashboardBestProfitLag | null;
};
