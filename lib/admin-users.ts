import "server-only";

import { sql } from "@/lib/db";
import { validateNewsDateParam } from "@/lib/news-date-param";

export type AdminUserListItem = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
  /** ISO 8601 from `registered_at`. */
  registeredAt: string;
};

type UserRow = {
  id: string | number;
  login: string;
  role: string;
  is_blocked: boolean;
  registered_at: Date;
};

function numId(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export type ListUsersForAdminFilters = {
  registeredFrom?: string;
  registeredTo?: string;
};

export async function listUsersForAdmin(
  filters?: ListUsersForAdminFilters,
): Promise<AdminUserListItem[]> {
  const registeredFrom = validateNewsDateParam(filters?.registeredFrom);
  const registeredTo = validateNewsDateParam(filters?.registeredTo);

  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (registeredFrom) {
    parts.push(`(u.registered_at::date) >= $${idx}::date`);
    params.push(registeredFrom);
    idx += 1;
  }
  if (registeredTo) {
    parts.push(`(u.registered_at::date) <= $${idx}::date`);
    params.push(registeredTo);
    idx += 1;
  }
  const where = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";

  const r = await sql<UserRow>(
    `
    SELECT u.id, u.login, u.role, u.is_blocked, u.registered_at
    FROM users u
    ${where}
    ORDER BY u.registered_at DESC, u.id ASC
    `,
    params,
  );
  return r.rows.map((row) => ({
    id: numId(row.id),
    login: row.login,
    role: row.role === "admin" ? "admin" : "analyst",
    isBlocked: row.is_blocked === true,
    registeredAt:
      row.registered_at instanceof Date
        ? row.registered_at.toISOString()
        : new Date(row.registered_at as unknown as string).toISOString(),
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

export type AdminDeleteUserResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404; message: string };

export async function deleteUserByAdmin(input: {
  actorUserId: number;
  targetUserId: number;
}): Promise<AdminDeleteUserResult> {
  if (input.targetUserId === input.actorUserId) {
    return { ok: false, status: 400, message: "Нельзя удалить свою учётную запись." };
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
    return { ok: false, status: 403, message: "Удаление администраторов запрещено." };
  }

  await sql(`DELETE FROM users WHERE id = $1 AND role = 'analyst'`, [input.targetUserId]);

  return { ok: true };
}
