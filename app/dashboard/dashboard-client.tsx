"use client";

import { useCallback, useEffect, useState } from "react";
import type { jsPDF } from "jspdf";

import { AdminUsersPanel } from "@/app/components/admin-users-panel";
import { DashboardCharts } from "@/app/components/dashboard-charts";
import { DashboardCompanyPredictBars } from "@/app/components/dashboard-company-predict-bars";
import { WinLoseDonut } from "@/app/components/win-lose-donut";
import { embedRobotoCyrillic } from "@/lib/dashboard-pdf-cyrillic";
import type { DashboardDayPoint, DashboardStatsPayload } from "@/lib/dashboard-types";
import { formatDisplayYmd, parseDisplayDateToYmd } from "@/lib/display-date";
import { formatLagMinutes } from "@/lib/format-lag-minutes";

type AdminUserExportRow = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
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
  className = "border-white/10 bg-white/5 text-cyan-100",
}: {
  title: string;
  value: number;
  note: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${className}`}>
      <p className="text-sm font-medium uppercase tracking-wide text-white/65">{title}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
        {formatSignedPercent(value)}%
      </p>
      <p className="mt-1 text-sm leading-snug text-white/55">{note}</p>
    </div>
  );
}

async function buildWorkbook(data: DashboardStatsPayload, adminUsers?: AdminUserExportRow[] | null) {
  const XLSX = await import("xlsx");
  const scopeLabel = data.scope === "all" ? "Все пользователи (админ)" : "Текущий пользователь";
  const lagLine =
    data.bestProfitLag == null
      ? "—"
      : `${formatLagMinutes(data.bestProfitLag.lagMinutes)} · Profit ${data.bestProfitLag.sumProfit.toFixed(2)}% · закр. ${data.bestProfitLag.closedCount}`;
  const summaryRows: (string | number)[][] = [
    ["Период", `${formatDisplayYmd(data.from)} — ${formatDisplayYmd(data.to)}`],
    ["Область", scopeLabel],
    ["Win (закрытые)", data.win],
    ["Lose (закрытые)", data.lose],
    ["Winrate", formatPct01(data.weightedWinrate)],
    ["Σ %", data.totalResultPercentSum],
    ["Profit %", data.totalProfitSum],
    ["Прибыльный горизонт (гор.)", lagLine],
    [],
  ];
  const header = ["Дата", "Winrate %", "Предсказаний", "Новостей", "Σ % дня", "Profit дня", "Σ % накопит.", "Profit накопит."];
  const body = data.days.map((d) => [
    formatDisplayYmd(d.date),
    d.winrate == null ? "" : (d.winrate * 100).toFixed(2),
    d.predictions,
    d.newsCount,
    d.sumResultPercent,
    d.sumProfit,
    d.cumulativeResultPercent,
    d.cumulativeProfit,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([...summaryRows, header, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Отчёт");

  const companyHeader = ["Тикер", "Компания", "Предсказаний"];
  const companyBody = (data.companyPredictCounts ?? []).map((c) => [c.ticker, c.name, c.count]);
  const wsCo = XLSX.utils.aoa_to_sheet([companyHeader, ...companyBody]);
  XLSX.utils.book_append_sheet(wb, wsCo, "По компаниям");

  if (data.scope === "all" && adminUsers != null) {
    const uHead = ["ID", "Логин", "Роль", "Доступ"];
    const uBody = adminUsers.map((u) => [
      u.id,
      u.login,
      u.role === "admin" ? "Администратор" : "Аналитик",
      u.isBlocked ? "Заблокирован" : "Активен",
    ]);
    const wsUsers = XLSX.utils.aoa_to_sheet([uHead, ...uBody]);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Пользователи");
  }

  return wb;
}

async function exportXlsx(data: DashboardStatsPayload, adminUsers?: AdminUserExportRow[] | null) {
  const XLSX = await import("xlsx");
  const wb = await buildWorkbook(data, adminUsers);
  XLSX.writeFile(wb, `dashboard_${data.from}_${data.to}.xlsx`);
}

async function fetchAdminUsersForExport(
  data: DashboardStatsPayload,
  isAdmin: boolean,
): Promise<AdminUserExportRow[] | null> {
  if (!isAdmin || data.scope !== "all") {
    return null;
  }
  const res = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as { users?: AdminUserExportRow[] };
  return json.users ?? [];
}

function pdfWriteParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  yStart: number,
  maxWidthMm: number,
  lineHeightMm: number,
): number {
  let y = yStart;
  const lines = doc.splitTextToSize(text, maxWidthMm);
  for (const line of lines) {
    if (y > 285) {
      doc.addPage();
      y = 12;
    }
    doc.text(line, x, y);
    y += lineHeightMm;
  }
  return y;
}

function pdfDrawDailyTable(doc: jsPDF, yStart: number, days: DashboardDayPoint[]): number {
  const left = 10;
  const right = 200;
  const rowH = 5;
  const headerH = 6.5;
  let y = yStart;

  doc.setFontSize(10);
  doc.setTextColor(28, 24, 52);
  y = pdfWriteParagraph(doc, "По дням", left, y, right - left, 5.5);
  y += 1;

  const drawHeader = (hy: number) => {
    doc.setFillColor(42, 36, 78);
    doc.setDrawColor(100, 90, 150);
    doc.setLineWidth(0.15);
    doc.rect(left, hy - 5, right - left, headerH, "FD");
    doc.setFontSize(8);
    doc.setTextColor(245, 243, 255);
    doc.text("Дата", left + 1.5, hy);
    doc.text("Win %", 54, hy, { align: "right" });
    doc.text("Пред.", 74, hy, { align: "right" });
    doc.text("Нов.", 90, hy, { align: "right" });
    doc.text("Σ % дня", 118, hy, { align: "right" });
    doc.text("Profit", 142, hy, { align: "right" });
    doc.text("Накоп. %", 170, hy, { align: "right" });
    doc.text("Нак. prof", right - 1.5, hy, { align: "right" });
    doc.setTextColor(28, 24, 52);
    doc.setFontSize(8);
  };

  drawHeader(y);
  y += headerH + 0.5;

  let rowIdx = 0;
  for (const d of days) {
    if (y > 278) {
      doc.addPage();
      y = 12;
      drawHeader(y);
      y += headerH + 0.5;
      rowIdx = 0;
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 246, 255);
      doc.rect(left, y - 4.3, right - left, rowH, "F");
    }

    const wr =
      d.winrate == null ? "—" : `${(d.winrate * 100).toFixed(1)}%`;
    doc.text(formatDisplayYmd(d.date), left + 1.5, y);
    doc.text(wr, 54, y, { align: "right" });
    doc.text(String(d.predictions), 74, y, { align: "right" });
    doc.text(String(d.newsCount), 90, y, { align: "right" });
    doc.text(d.sumResultPercent.toFixed(2), 118, y, { align: "right" });
    doc.text(d.sumProfit.toFixed(2), 142, y, { align: "right" });
    doc.text(d.cumulativeResultPercent.toFixed(2), 170, y, { align: "right" });
    doc.text(d.cumulativeProfit.toFixed(2), right - 1.5, y, { align: "right" });

    doc.setDrawColor(220, 215, 240);
    doc.setLineWidth(0.05);
    doc.line(left, y + 1.1, right, y + 1.1);

    y += rowH;
    rowIdx += 1;
  }

  return y + 2;
}

async function exportPdf(data: DashboardStatsPayload, adminUsers?: AdminUserExportRow[] | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await embedRobotoCyrillic(doc);

  const scopeLabel = data.scope === "all" ? "Все пользователи (админ)" : "Текущий пользователь";
  let y = 12;
  doc.setFontSize(14);
  y = pdfWriteParagraph(doc, "DiplomApp — отчёт дашборда", 14, y, 182, 7);
  y += 3;
  doc.setFontSize(10);
  const lagPdf =
    data.bestProfitLag == null
      ? "Прибыльный горизонт: —"
      : `Прибыльный горизонт: ${formatLagMinutes(data.bestProfitLag.lagMinutes)}, Profit ${data.bestProfitLag.sumProfit.toFixed(2)}, закр. ${data.bestProfitLag.closedCount}`;
  const lines = [
    `Период: ${formatDisplayYmd(data.from)} — ${formatDisplayYmd(data.to)}`,
    `Область: ${scopeLabel}`,
    `Win / Lose: ${data.win} / ${data.lose}`,
    `Winrate: ${formatPct01(data.weightedWinrate)}`,
    `Σ %: ${data.totalResultPercentSum}`,
    `Profit %: ${data.totalProfitSum}`,
    lagPdf,
    "",
  ];
  for (const line of lines) {
    y = pdfWriteParagraph(doc, line, 14, y, 182, 5.5);
  }
  y += 2;
  y = pdfDrawDailyTable(doc, y, data.days);

  y += 4;
  if (y > 250) {
    doc.addPage();
    y = 12;
  }
  doc.setFontSize(10);
  y = pdfWriteParagraph(doc, "Предсказания по компаниям (тикер)", 14, y, 182, 6);
  y += 1;
  doc.setFontSize(8);
  for (const c of data.companyPredictCounts ?? []) {
    const row = `${c.ticker} — ${c.name} — ${c.count}`;
    y = pdfWriteParagraph(doc, row, 14, y, 182, 4);
  }

  if (data.scope === "all" && adminUsers != null) {
    y += 6;
    if (y > 248) {
      doc.addPage();
      y = 12;
    }
    doc.setFontSize(10);
    y = pdfWriteParagraph(doc, "Пользователи", 14, y, 182, 6);
    y += 1;
    doc.setFontSize(8);
    for (const u of adminUsers) {
      const roleRu = u.role === "admin" ? "админ" : "аналитик";
      const access = u.isBlocked ? "заблокирован" : "активен";
      const row = `${u.id} | ${u.login} | ${roleRu} | ${access}`;
      y = pdfWriteParagraph(doc, row, 14, y, 182, 4);
    }
  }

  doc.save(`dashboard_${data.from}_${data.to}.pdf`);
}

type Props = {
  isAdmin: boolean;
};

export function DashboardClient({ isAdmin }: Props) {
  const [from, setFrom] = useState(defaultFromYmd);
  const [to, setTo] = useState(defaultToYmd);
  const [fromDraft, setFromDraft] = useState(() => formatDisplayYmd(defaultFromYmd()));
  const [toDraft, setToDraft] = useState(() => formatDisplayYmd(defaultToYmd()));
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserExportRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

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
  }, [from, to, isAdmin, selectedUserId]);

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
        const adminUsers = await fetchAdminUsersForExport(stats, isAdmin);
        if (kind === "xlsx") {
          await exportXlsx(stats, adminUsers);
        } else {
          await exportPdf(stats, adminUsers);
        }
      } catch (e) {
        console.error(e);
        setError("Не удалось сформировать файл.");
      } finally {
        setExporting(false);
      }
    },
    [stats, isAdmin],
  );

  const selectedAdminUser = adminUsers.find((u) => String(u.id) === selectedUserId);
  const adminStatsTitle =
    selectedUserId === "all"
      ? "Общая статистика по всем пользователям"
      : `Статистика пользователя ${selectedAdminUser?.login ?? selectedUserId}`;
  const animKey = `${from}|${to}|${selectedUserId}|${stats?.win ?? 0}-${stats?.lose ?? 0}`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/12 bg-[#0c0824]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Интервал и экспорт</h2>
            <p className="mt-2 text-base leading-snug text-white/60">
              Предсказания по дате новости.
              {isAdmin ? " Админ может смотреть всех пользователей или выбранного аналитика." : ""}
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
                    const next = e.target.value;
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
                    const next = e.target.value;
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
        className="grid gap-5 transition-all duration-500 ease-out lg:grid-cols-[min(330px,100%)_1fr] lg:items-stretch"
        style={{ opacity: pending ? 0.55 : 1 }}
      >
        <div className={`${PANEL} flex h-full min-h-0 flex-col`}>
          {stats && (
            <>
              <p className="text-base font-semibold uppercase tracking-wide text-white/65">
                Винрейт
              </p>
              <p className="mt-1.5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {formatPct01(stats.weightedWinrate)}
              </p>
              <WinLoseDonut win={stats.win} lose={stats.lose} className="mx-auto mt-4 max-w-[220px]" />
              <DashboardCompanyPredictBars
                items={stats.companyPredictCounts ?? []}
                bestProfitLag={stats.bestProfitLag ?? null}
                className="mt-3"
              />
              <div className="mt-4 space-y-3">
                <MetricCard
                  title="Σ %"
                  value={stats.totalResultPercentSum}
                  note="Сумма result_percent"
                />
                <MetricCard
                  title="Profit %"
                  value={stats.totalProfitSum}
                  note="Win положит., lose отрицат."
                  className={
                    stats.totalProfitSum < 0
                      ? "border-rose-400/20 bg-rose-500/15 text-rose-100"
                      : "border-emerald-400/20 bg-emerald-500/15 text-emerald-100"
                  }
                />
              </div>
              <div className="flex-1" aria-hidden />
            </>
          )}
          {!stats && !pending && <p className="text-base text-white/60">Нет данных.</p>}
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col">
          {stats && <DashboardCharts stats={stats} className="h-full min-h-0" />}
          {pending && !stats && (
            <div className="h-52 animate-pulse rounded-xl bg-white/5" aria-hidden />
          )}
        </div>
      </div>

      {isAdmin ? <AdminUsersPanel /> : null}
    </div>
  );
}
