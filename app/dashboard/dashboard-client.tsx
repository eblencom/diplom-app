"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardAdminUserActivityChart } from "@/app/components/dashboard-admin-user-activity";
import { DashboardCompanyBarCharts } from "@/app/components/dashboard-company-bar-charts";
import { DashboardVisualSummary } from "@/app/components/dashboard-visual-summary";
import { DashboardCompanyPredictBars } from "@/app/components/dashboard-company-predict-bars";
import { WinLoseDonut } from "@/app/components/win-lose-donut";
import {
  exportDashboardPdf,
  exportDashboardXlsx,
  type DashboardExportMeta,
} from "@/lib/dashboard-export";
import type { DashboardStatsPayload } from "@/lib/dashboard-types";
import { formatDisplayYmd, parseDisplayDateToYmd } from "@/lib/display-date";
import { formatDdMmYyyyTyping } from "@/lib/news-date-param";

// klient dashborda: interval dat, zapros statistiki, diagrammy, eksport; u admina — vybor polzovatelya
type AdminUserExportRow = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
  registeredAt?: string;
};

const PANEL =
  "rounded-xl border border-white/15 bg-black/20 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-6";

function defaultToYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFromYmd(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 29);
  return d.toISOString().slice(0, 10);
}

function formatPct01(x: number | null) {
  if (x == null) {
    return "—";
  }
  return `${(x * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MetricCard({
  title,
  value,
  note,
  className = "border-white/10 bg-white/5",
}: {
  title: string;
  value: number;
  note: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${className}`}>
      <p className="text-sm font-medium uppercase tracking-wide text-white/65">{title}</p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-white sm:text-4xl">
        {formatSignedPercent(value)}%
      </p>
      <p className="mt-1 text-sm leading-snug text-white/55">{note}</p>
    </div>
  );
}

type Props = {
  isAdmin: boolean;
};

const ADMIN_ACTIVITY_DAY_OPTIONS = [7, 14, 30] as const;

export function DashboardClient({ isAdmin }: Props) {
  const [from, setFrom] = useState(defaultFromYmd);
  const [to, setTo] = useState(defaultToYmd);
  const [fromDraft, setFromDraft] = useState(() => formatDisplayYmd(defaultFromYmd()));
  const [toDraft, setToDraft] = useState(() => formatDisplayYmd(defaultToYmd()));
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserExportRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [activityDays, setActivityDays] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    setActivityDays((d) => {
      if ((ADMIN_ACTIVITY_DAY_OPTIONS as readonly number[]).includes(d)) {
        return d;
      }
      const capped = Math.min(30, Math.max(1, d));
      return ADMIN_ACTIVITY_DAY_OPTIONS.reduce((best, n) =>
        Math.abs(n - capped) < Math.abs(best - capped) ? n : best,
      );
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    let alive = true;
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" });
        const data = (await response.json()) as { users?: AdminUserExportRow[] };
        if (alive && response.ok) {
          setAdminUsers(data.users ?? []);
        }
      } catch {
        if (alive) {
          setAdminUsers([]);
        }
      }
    }
    void loadUsers();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    setFromDraft(formatDisplayYmd(from));
  }, [from]);

  useEffect(() => {
    setToDraft(formatDisplayYmd(to));
  }, [to]);

  const load = useCallback(async () => {
    if (!from || !to || from > to) {
      setError("Укажите корректный интервал дат.");
      setStats(null);
      setPending(false);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (isAdmin && selectedUserId !== "all") {
        params.set("userId", selectedUserId);
      }
      if (isAdmin) {
        params.set("adminActivityDays", String(activityDays));
      }
      const response = await fetch(
        `/api/dashboard/stats?${params.toString()}`,
        { credentials: "include", cache: "no-store" },
      );
      const raw = (await response.json()) as DashboardStatsPayload | { error?: string };
      if (!response.ok) {
        setError((raw as { error?: string }).error ?? "Ошибка загрузки");
        setStats(null);
        return;
      }
      setStats(raw as DashboardStatsPayload);
    } catch {
      setError("Сеть недоступна.");
      setStats(null);
    } finally {
      setPending(false);
    }
  }, [from, to, isAdmin, selectedUserId, activityDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const [exporting, setExporting] = useState(false);

  const onExport = useCallback(
    async (kind: "xlsx" | "pdf") => {
      if (!stats) {
        return;
      }
      setExporting(true);
      try {
        const picked =
          selectedUserId === "all" ? null : adminUsers.find((u) => String(u.id) === selectedUserId);
        const sliceLabel = isAdmin
          ? selectedUserId === "all"
            ? "Общая статистика по всем пользователям"
            : `Статистика пользователя «${picked?.login ?? selectedUserId}»`
          : "Текущий пользователь (личная статистика)";
        const meta: DashboardExportMeta = { sliceLabel };
        if (kind === "xlsx") {
          await exportDashboardXlsx(stats, meta);
        } else {
          await exportDashboardPdf(stats, meta);
        }
      } catch (e) {
        console.error(e);
        setError("Не удалось сформировать файл.");
      } finally {
        setExporting(false);
      }
    },
    [stats, isAdmin, selectedUserId, adminUsers],
  );

  const selectedAdminUser = adminUsers.find((u) => String(u.id) === selectedUserId);
  const adminStatsTitle =
    selectedUserId === "all"
      ? "Общая статистика по всем пользователям"
      : `Статистика пользователя ${selectedAdminUser?.login ?? selectedUserId}`;
  const predictScopeLabel =
    selectedUserId === "all"
      ? "все пользователи (агрегат по прогнозам)"
      : `пользователь «${selectedAdminUser?.login ?? selectedUserId}»`;
  const animKey = `${from}|${to}|${selectedUserId}|${activityDays}|${stats?.win ?? 0}-${stats?.lose ?? 0}`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/12 bg-[#0c0824]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Интервал и экспорт</h2>
            <p className="mt-2 text-base leading-snug text-white/60">
              Статистика за выбранный период.
              {isAdmin ? " Администратор может смотреть как всех пользователей, так и конкретного аналитика." : ""}
            </p>
            {isAdmin ? (
              <h3 className="mt-4 text-2xl font-semibold text-cyan-100 sm:text-3xl">
                {adminStatsTitle}
              </h3>
            ) : null}
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-base">
                <span className="text-white/70">С</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="дд/мм/гггг"
                  maxLength={10}
                  value={fromDraft}
                  onChange={(e) => {
                    const next = formatDdMmYyyyTyping(e.target.value);
                    setFromDraft(next);
                    const parsed = parseDisplayDateToYmd(next);
                    if (parsed) {
                      setFrom(parsed);
                    }
                  }}
                  onBlur={() => {
                    if (!parseDisplayDateToYmd(fromDraft)) {
                      setFromDraft(formatDisplayYmd(from));
                    }
                  }}
                  className="block w-36 rounded-lg border border-white/20 bg-[#151046] px-3 py-2.5 text-lg text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-base">
                <span className="text-white/70">По</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="дд/мм/гггг"
                  maxLength={10}
                  value={toDraft}
                  onChange={(e) => {
                    const next = formatDdMmYyyyTyping(e.target.value);
                    setToDraft(next);
                    const parsed = parseDisplayDateToYmd(next);
                    if (parsed) {
                      setTo(parsed);
                    }
                  }}
                  onBlur={() => {
                    if (!parseDisplayDateToYmd(toDraft)) {
                      setToDraft(formatDisplayYmd(to));
                    }
                  }}
                  className="block w-36 rounded-lg border border-white/20 bg-[#151046] px-3 py-2.5 text-lg text-white"
                />
              </label>
              {isAdmin ? (
                <label className="flex items-center gap-2 text-base">
                  <span className="text-white/70">Пользователь</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="block min-w-56 rounded-lg border border-white/20 bg-[#151046] px-3 py-2.5 text-lg text-white"
                  >
                    <option value="all">Все пользователи</option>
                    {adminUsers.map((user) => (
                      <option key={user.id} value={String(user.id)}>
                        {user.login} ({user.role === "admin" ? "админ" : "аналитик"})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full border border-white/30 px-5 py-2.5 text-base font-medium text-white/90 hover:bg-white/10"
              >
                Обновить
              </button>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5 border-t border-white/10 pt-3 lg:border-t-0 lg:pt-0">
            <button
              type="button"
              disabled={!stats || exporting}
              onClick={() => void onExport("xlsx")}
              className="rounded-full border border-emerald-400/45 bg-emerald-600/25 px-5 py-2.5 text-base font-semibold text-emerald-50 shadow-sm transition hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Экспорт Excel
            </button>
            <button
              type="button"
              disabled={!stats || exporting}
              onClick={() => void onExport("pdf")}
              className="rounded-full border border-rose-400/45 bg-rose-600/25 px-5 py-2.5 text-base font-semibold text-rose-50 shadow-sm transition hover:bg-rose-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Экспорт PDF
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-base text-rose-300/90">{error}</p>}
      </div>

      <div
        key={animKey}
        className="grid min-h-[min(62dvh,720px)] gap-5 transition-all duration-500 ease-out lg:grid-cols-[min(330px,100%)_1fr] lg:items-stretch"
        style={{ opacity: pending ? 0.55 : 1 }}
      >
        <div className={`${PANEL} flex h-full min-h-0 flex-col`}>
          {stats && (
            <>
              <p className="text-base font-semibold uppercase tracking-wide text-white/65">
                Соотношение успешных (Win) / неуспешных (Lose) прогнозов
              </p>
              <p className="mt-1.5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {formatPct01(stats.weightedWinrate)}
              </p>
              <WinLoseDonut win={stats.win} lose={stats.lose} className="mx-auto mt-4 max-w-[220px]" />
              <DashboardCompanyPredictBars
                items={stats.categoryPredictCounts ?? []}
                bestProfitLag={stats.bestProfitLag ?? null}
                className="mt-3"
              />
              <div className="mt-4 space-y-3">
                <MetricCard
                  title="Общее настроение на рынке"
                  value={stats.totalResultPercentSum}
                  note="Сумма процентного изменения цен по закрытым прогнозам"
                />
                <MetricCard
                  title="Результативность %"
                  value={stats.totalProfitSum}
                  note="Положительный = прибыль Отрицательный = убыток"
                  className={
                    stats.totalProfitSum < 0
                      ? "border-rose-400/20 bg-rose-500/15"
                      : "border-emerald-400/20 bg-emerald-500/15"
                  }
                />
              </div>
              <div className="flex-1" aria-hidden />
            </>
          )}
          {!stats && !pending && <p className="text-base text-white/60">Нет данных.</p>}
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
          {stats && (
            <>
              <DashboardVisualSummary stats={stats} />
              <DashboardCompanyBarCharts
                fromYmd={stats.from}
                toYmd={stats.to}
                scopeLabel={predictScopeLabel}
                newsItems={stats.companyNewsCounts ?? []}
                predictItems={stats.companyPredictCounts ?? []}
              />
              {isAdmin && stats.adminUserActivity ? (
                <DashboardAdminUserActivityChart
                  className="min-h-0 flex-1"
                  activity={stats.adminUserActivity}
                  activityDays={activityDays}
                  onActivityDaysChange={(n) => setActivityDays(n)}
                  disabled={pending}
                />
              ) : null}
            </>
          )}
          {pending && !stats && (
            <div className="h-52 animate-pulse rounded-xl bg-white/5" aria-hidden />
          )}
        </div>
      </div>

    </div>
  );
}
