import "server-only";

import { sql } from "@/lib/db";
import { getUserTickerAlertCompanyIds } from "@/lib/user-ticker-alerts";

export type UserTelegramState = {
  tgUsername: string;
  tgChatId: number | null;
  alertCompanyIds: number[];
  newsIntervalMinutes: number;
};

export async function getUserTelegramState(userId: number): Promise<UserTelegramState> {
  const result = await sql<{
    tg_username: string;
    tg_chat_id: string | number | null;
    tg_news_interval_minutes: string | number | null;
  }>(
    `
      SELECT tg_username, tg_chat_id, tg_news_interval_minutes
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );
  const row = result.rows[0];
  const rawChat = row?.tg_chat_id;
  const tgChatId =
    rawChat === null || rawChat === undefined || rawChat === ""
      ? null
      : Number(rawChat);

  const alertCompanyIds = await getUserTickerAlertCompanyIds(userId);
  const rawInterval = Number(row?.tg_news_interval_minutes ?? 10);
  const newsIntervalMinutes =
    Number.isFinite(rawInterval) && rawInterval >= 1 && rawInterval <= 1440
      ? Math.round(rawInterval)
      : 10;

  return {
    tgUsername: row?.tg_username ?? "",
    tgChatId: Number.isFinite(tgChatId) ? tgChatId : null,
    alertCompanyIds,
    newsIntervalMinutes,
  };
}

export async function updateUserTgUsername(userId: number, tgUsername: string): Promise<void> {
  if (tgUsername === "") {
    await sql(
      `UPDATE users SET tg_username = '', tg_chat_id = NULL WHERE id = $1`,
      [userId],
    );
    return;
  }
  await sql(`UPDATE users SET tg_username = $1 WHERE id = $2`, [tgUsername, userId]);
}

export async function updateUserTgNewsInterval(
  userId: number,
  minutes: number,
): Promise<number> {
  const safe = Math.min(1440, Math.max(1, Math.round(minutes)));
  await sql(`UPDATE users SET tg_news_interval_minutes = $1 WHERE id = $2`, [safe, userId]);
  return safe;
}

export async function markUserTgDigestTimersNow(userId: number): Promise<void> {
  await sql(
    `
      UPDATE users
      SET tg_price_last_digest_at = NOW(),
          tg_news_last_digest_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );
}
