import "server-only";

import { sql } from "@/lib/db";
import type { UserWinrateStats } from "@/lib/user-winrate-model";

type Row = {
  win: string | number | null;
  lose: string | number | null;
};

function toInt(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function getUserWinrateStats(userId: number): Promise<UserWinrateStats> {
  const res = await sql<Row>(
    `
      SELECT
        SUM(CASE WHEN result = 'win'  THEN 1 ELSE 0 END) AS win,
        SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) AS lose
      FROM predicts
      WHERE user_id = $1
        AND status = 'closed'
    `,
    [userId],
  );

  const row = res.rows[0] ?? { win: 0, lose: 0 };
  const win = toInt(row.win);
  const lose = toInt(row.lose);
  const total = win + lose;
  const winrate = total > 0 ? win / total : null;

  return { win, lose, total, winrate };
}

