import "server-only";

import { sql } from "@/lib/db";
import { getUserTickerAlertCompanyIds } from "@/lib/user-ticker-alerts";

export type UserTelegramState = {
  tgUsername: string;
  tgChatId: number | null;
  alertCompanyIds: number[];
};

export async function getUserTelegramState(userId: number): Promise<UserTelegramState> {
  const result = await sql<{ tg_username: string; tg_chat_id: string | number | null }>(
    `
      SELECT tg_username, tg_chat_id
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

  return {
    tgUsername: row?.tg_username ?? "",
    tgChatId: Number.isFinite(tgChatId) ? tgChatId : null,
    alertCompanyIds,
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
