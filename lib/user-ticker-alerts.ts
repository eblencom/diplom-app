import "server-only";

import { getTickerAlertCompanyIds, setTickerAlertCompanyIds } from "@/lib/user-preference-items";

export async function getUserTickerAlertCompanyIds(userId: number): Promise<number[]> {
  return getTickerAlertCompanyIds(userId);
}

export async function setUserTickerAlertCompanyIds(userId: number, companyIds: number[]): Promise<void> {
  return setTickerAlertCompanyIds(userId, companyIds);
}
