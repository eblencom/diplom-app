"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUserRow = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { users?: AdminUserRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось загрузить список");
        setUsers(null);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("Сеть недоступна.");
      setUsers(null);
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBlocked = async (u: AdminUserRow) => {
    if (u.role === "admin") {
      return;
    }
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isBlocked: !u.isBlocked }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка сохранения");
        return;
      }
      await load();
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: AdminUserRow) => {
    if (u.role === "admin") {
      return;
    }
    const confirmed = window.confirm(
      `Удалить учётную запись «${u.login}» (ID ${u.id})? Действие необратимо, связанные данные будут удалены.`,
    );
    if (!confirmed) {
      return;
    }
    setBusyDeleteId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить пользователя");
        return;
      }
      await load();
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/12 bg-[#0c0824]/70 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Учётные записи</h2>
          <p className="mt-1 text-sm text-white/55">
            Просмотр пользователей, блокировка и разблокировка входа (аналитики), удаление учётных
            записей аналитиков. Администраторов нельзя отключить или удалить.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={pending}
          className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
        >
          Обновить список
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300/90">{error}</p> : null}

      {pending && !users ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-white/5" aria-hidden />
      ) : null}

      {users && users.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06] text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Логин</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Доступ</th>
                <th className="px-4 py-3 font-medium">Блокировка</th>
                <th className="px-4 py-3 font-medium">Удаление</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isAdmin = u.role === "admin";
                const blocked = u.isBlocked;
                return (
                  <tr key={u.id} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-white/55">{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.login}</td>
                    <td className="px-4 py-3 text-white/70">{isAdmin ? "Админ" : "Аналитик"}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <span className="text-white/45">—</span>
                      ) : blocked ? (
                        <span className="text-rose-300/90">Заблокирован</span>
                      ) : (
                        <span className="text-emerald-300/90">Активен</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <span className="text-xs text-white/40">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id || busyDeleteId === u.id}
                          onClick={() => void toggleBlocked(u)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            blocked
                              ? "border border-emerald-400/40 bg-emerald-600/20 text-emerald-100 hover:bg-emerald-600/30"
                              : "border border-rose-400/40 bg-rose-600/20 text-rose-100 hover:bg-rose-600/30"
                          }`}
                        >
                          {busyId === u.id ? "…" : blocked ? "Разблокировать" : "Заблокировать"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <span className="text-xs text-white/40">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id || busyDeleteId === u.id}
                          onClick={() => void deleteUser(u)}
                          className="rounded-full border border-red-400/45 bg-red-900/35 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-900/55 disabled:opacity-50"
                        >
                          {busyDeleteId === u.id ? "…" : "Удалить"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {users && users.length === 0 && !pending ? (
        <p className="mt-6 text-sm text-white/50">Пользователей нет.</p>
      ) : null}
    </section>
  );
}
