export type UserWinrateStats = {
  win: number;
  lose: number;
  total: number;
  winrate: number | null;
  companiesCount: number;
  newsCount: number;
  predictsCount: number;
  oldestNewsAt: string | null;
};
