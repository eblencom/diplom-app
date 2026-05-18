export type DashboardClosedPredictRow = {
  id: number;
  newsDate: string;
  ticker: string;
  companyName: string;
  /** Заполняется при агрегате «все пользователи». */
  userLogin: string | null;
  prediction: "positive" | "negative";
  resultPercent: number;
  result: "win" | "lose";
};

/** Строка для отчёта администратора (лист «Пользователи»). */
export type DashboardExportAdminUser = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  registeredAt: string;
  predictCount: number;
};

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

/** Прогнозы по категории: один прогноз входит в счёт каждой категории из `companies.category_slugs`. */
export type DashboardCategoryPredictCount = {
  slug: string;
  label: string;
  count: number;
};

/** Новости по компаниям за период (все пользователи, только объём новостей). */
export type DashboardCompanyNewsCount = {
  ticker: string;
  name: string;
  count: number;
};

export type DashboardBestProfitLag = {
  lagMinutes: number;
  sumProfit: number;
  closedCount: number;
};

export type DashboardVisualSummary = {
  totalPredictions: number;
  bestPositiveProfit: number | null;
  worstNegativeProfit: number | null;
  busiestNewsDay: {
    date: string;
    newsCount: number;
  } | null;
};

/** По дню новости: сколько разных пользователей сделали прогноз и сколько прогнозов всего. */
export type DashboardUserActivityPoint = {
  date: string;
  activeUsers: number;
  predictCount: number;
};

export type DashboardAdminUserActivity = {
  windowDays: number;
  points: DashboardUserActivityPoint[];
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
  categoryPredictCounts: DashboardCategoryPredictCount[];
  companyNewsCounts: DashboardCompanyNewsCount[];
  bestProfitLag: DashboardBestProfitLag | null;
  visualSummary: DashboardVisualSummary;
  /** Только для админа: активность за последние `windowDays` дней (независимо от интервала отчёта). */
  adminUserActivity: DashboardAdminUserActivity | null;
  /** Закрытые прогнозы (позитив/негатив) для выгрузки PDF/Excel. */
  closedPredictRows: DashboardClosedPredictRow[];
  /** Только админ, срез «все»: пользователи с числом прогнозов за период. */
  adminExportUsers: DashboardExportAdminUser[] | null;
};
