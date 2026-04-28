export type DashboardDayPoint = {
  date: string;
  winrate: number | null;
  predictions: number;
  newsCount: number;
  sumResultPercent: number;
  sumProfit: number;
  cumulativeResultPercent: number;
  cumulativeProfit: number;
};

export type DashboardCompanyPredictCount = {
  ticker: string;
  name: string;
  count: number;
};

export type DashboardBestProfitLag = {
  lagMinutes: number;
  sumProfit: number;
  closedCount: number;
};

export type DashboardStatsPayload = {
  from: string;
  to: string;
  scope: "user" | "all";
  win: number;
  lose: number;
  weightedWinrate: number | null;
  totalResultPercentSum: number;
  totalProfitSum: number;
  days: DashboardDayPoint[];
  companyPredictCounts: DashboardCompanyPredictCount[];
  bestProfitLag: DashboardBestProfitLag | null;
};
