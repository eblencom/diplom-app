import "server-only";

import { sql } from "@/lib/db";

export async function getUserTickerAlertCompanyIds(userId: number): Promise<number[]> {
  const result = await sql<{ company_id: string | number }>(
    `
      SELECT company_id
      FROM user_ticker_alerts
      WHERE user_id = $1
      ORDER BY company_id ASC
    `,
    [userId],
  );
  return result.rows.map((r) => Number(r.company_id));
}

export async function setUserTickerAlertCompanyIds(
  userId: number,
  companyIds: number[],
): Promise<void> {
  const unique = [...new Set(companyIds)].filter((id) => Number.isFinite(id) && id > 0);
  if (unique.length === 0) {
    await sql(`DELETE FROM user_ticker_alerts WHERE user_id = $1`, [userId]);
    return;
  }

  const valid = await sql<{ id: string | number }>(
    `
      SELECT id FROM companies WHERE id = ANY($1::bigint[])
    `,
    [unique],
  );
  const allowed = new Set(valid.rows.map((r) => Number(r.id)));
  const filtered = unique.filter((id) => allowed.has(id));

  await sql(`DELETE FROM user_ticker_alerts WHERE user_id = $1`, [userId]);
  if (filtered.length === 0) {
    return;
  }

  await sql(
    `
      INSERT INTO user_ticker_alerts (user_id, company_id)
      SELECT $1::bigint, x
      FROM unnest($2::bigint[]) AS x
    `,
    [userId, filtered],
  );
}
