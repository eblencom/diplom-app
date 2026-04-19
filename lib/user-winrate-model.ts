export type UserWinrateStats = {
  win: number;
  lose: number;
  total: number;
  winrate: number | null;
  /** Всего компаний в базе */
  companiesCount: number;
  /** Всего новостей в базе */
  newsCount: number;
  /** Все предсказания текущего пользователя */
  predictsCount: number;
  /** ISO 8601 — дата самой ранней новости в базе (для сноски) */
  oldestNewsAt: string | null;
};
