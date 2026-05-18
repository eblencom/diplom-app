"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { formatDisplayDateTime } from "@/lib/display-date";
import {
  formatDdMmYyyyTyping,
  isoDateToDdMmYyyy,
  parseDdMmYyyyToIso,
  validateNewsDateParam,
} from "@/lib/news-date-param";

type AdminUserRow = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
  registeredAt: string;
};

function pushAdminDateFilters(
  router: ReturnType<typeof useRouter>,
  base: URLSearchParams,
  patch: { from?: string; to?: string },
) {
  const next = new URLSearchParams(base.toString());
  if (patch.from !== undefined) {
    if (patch.from === "") {
      next.delete("from");
    } else {
      next.set("from", patch.from);
    }
  }
  if (patch.to !== undefined) {
    if (patch.to === "") {
      next.delete("to");
    } else {
      next.set("to", patch.to);
    }
  }
  const q = next.toString();
  router.push(q ? `/admin?${q}` : "/admin");
}

export function AdminUsersPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listPending, setListPending] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);

  const fromValue = searchParams.get("from") ?? "";
  const toValue = searchParams.get("to") ?? "";

  const [fromInput, setFromInput] = useState(() =>
    isoDateToDdMmYyyy(validateNewsDateParam(fromValue)),
  );
  const [toInput, setToInput] = useState(() => isoDateToDdMmYyyy(validateNewsDateParam(toValue)));

  useEffect(() => {
    setFromInput(isoDateToDdMmYyyy(validateNewsDateParam(fromValue)));
  }, [fromValue]);

  useEffect(() => {
    setToInput(isoDateToDdMmYyyy(validateNewsDateParam(toValue)));
  }, [toValue]);

  const load = useCallback(async () => {
    setError(null);
    setListPending(true);
    try {
      const qs = new URLSearchParams();
      const vf = validateNewsDateParam(fromValue);
      const vt = validateNewsDateParam(toValue);
      if (vf) {
        qs.set("from", vf);
      }
      if (vt) {
        qs.set("to", vt);
      }
      const path = qs.size > 0 ? `/api/admin/users?${qs.toString()}` : "/api/admin/users";
      const res = await fetch(path, { credentials: "include", cache: "no-store" });
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
      setListPending(false);
    }
  }, [fromValue, toValue]);

  useEffect(() => {
    void load();
  }, [load]);

  const commitFromBlur = useCallback(() => {
    const trimmed = fromInput.trim();
    if (trimmed === "") {
      if (validateNewsDateParam(fromValue)) {
        startTransition(() => {
          pushAdminDateFilters(router, searchParams, { from: "" });
        });
      }
      return;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setFromInput(isoDateToDdMmYyyy(validateNewsDateParam(fromValue)));
      return;
    }
    if (iso === validateNewsDateParam(fromValue)) {
      setFromInput(isoDateToDdMmYyyy(iso));
      return;
    }
    startTransition(() => {
      pushAdminDateFilters(router, searchParams, { from: iso });
    });
  }, [fromInput, fromValue, router, searchParams]);

  const commitToBlur = useCallback(() => {
    const trimmed = toInput.trim();
    if (trimmed === "") {
      if (validateNewsDateParam(toValue)) {
        startTransition(() => {
          pushAdminDateFilters(router, searchParams, { to: "" });
        });
      }
      return;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setToInput(isoDateToDdMmYyyy(validateNewsDateParam(toValue)));
      return;
    }
    if (iso === validateNewsDateParam(toValue)) {
      setToInput(isoDateToDdMmYyyy(iso));
      return;
    }
    startTransition(() => {
      pushAdminDateFilters(router, searchParams, { to: iso });
    });
  }, [toInput, toValue, router, searchParams]);

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

  const dateFilterActive = Boolean(validateNewsDateParam(fromValue) || validateNewsDateParam(toValue));

  const clearDateFilters = () => {
    startTransition(() => {
      pushAdminDateFilters(router, searchParams, { from: "", to: "" });
    });
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
          disabled={listPending || pending}
          className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
        >
          Обновить список
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[200px]">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">
              Регистрация с
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="дд/мм/гггг"
              title="Формат дд/мм/гггг, применение по Tab или Enter"
              value={fromInput}
              onChange={(e) => setFromInput(formatDdMmYyyyTyping(e.target.value))}
              onBlur={() => commitFromBlur()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={listPending || pending}
              className="w-full rounded-md border border-white/20 bg-[#12082c] px-2 py-2 text-center text-sm font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
            />
          </div>
          <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[200px]">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">
              Регистрация по
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="дд/мм/гггг"
              title="Формат дд/мм/гггг, применение по Tab или Enter"
              value={toInput}
              onChange={(e) => setToInput(formatDdMmYyyyTyping(e.target.value))}
              onBlur={() => commitToBlur()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={listPending || pending}
              className="w-full rounded-md border border-white/20 bg-[#12082c] px-2 py-2 text-center text-sm font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
            />
          </div>
        </div>
        {dateFilterActive ? (
          <button
            type="button"
            onClick={clearDateFilters}
            disabled={listPending || pending}
            className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            Сбросить даты
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300/90">{error}</p> : null}

      {listPending && !users ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-white/5" aria-hidden />
      ) : null}

      {users && users.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06] text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Логин</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
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
                const regLabel = formatDisplayDateTime(new Date(u.registeredAt));
                return (
                  <tr key={u.id} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-white/55">{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.login}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/75">{regLabel}</td>
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

      {users && users.length === 0 && !listPending ? (
        <p className="mt-6 text-sm text-white/50">
          {dateFilterActive
            ? "Нет пользователей в выбранном диапазоне дат регистрации."
            : "Пользователей нет."}
        </p>
      ) : null}
    </section>
  );
}
