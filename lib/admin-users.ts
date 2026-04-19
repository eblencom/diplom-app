import "server-only";

import { sql } from "@/lib/db";

export type AdminUserListItem = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
};

type UserRow = {
  id: string | number;
  login: string;
  role: string;
  is_blocked: boolean;
};

function numId(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  const r = await sql<UserRow>(
    `
    SELECT id, login, role, is_blocked
    FROM users
    ORDER BY id ASC
    `,
  );
  return r.rows.map((row) => ({
    id: numId(row.id),
    login: row.login,
    role: row.role === "admin" ? "admin" : "analyst",
    isBlocked: row.is_blocked === true,
  }));
}

export type SetUserBlockedResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404; message: string };

export async function setUserBlockedByAdmin(input: {
  actorUserId: number;
  targetUserId: number;
  isBlocked: boolean;
}): Promise<SetUserBlockedResult> {
  if (input.targetUserId === input.actorUserId) {
    return { ok: false, status: 400, message: "Нельзя изменить статус своей учётной записи." };
  }

  const target = await sql<{ id: string | number; role: string }>(
    `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
    [input.targetUserId],
  );
  const t = target.rows[0];
  if (!t) {
    return { ok: false, status: 404, message: "Пользователь не найден." };
  }
  if (t.role === "admin") {
    return { ok: false, status: 403, message: "Статус администраторов не меняется." };
  }

  await sql(`UPDATE users SET is_blocked = $1 WHERE id = $2 AND role = 'analyst'`, [
    input.isBlocked,
    input.targetUserId,
  ]);

  return { ok: true };
}
