"use client";

import { useCallback, useEffect, useState } from "react";
import type { jsPDF } from "jspdf";

import { AdminUsersPanel } from "@/app/components/admin-users-panel";
import { DashboardCharts } from "@/app/components/dashboard-charts";
import { DashboardCompanyPredictBars } from "@/app/components/dashboard-company-predict-bars";
import { WinLoseDonut } from "@/app/components/win-lose-donut";
import { embedRobotoCyrillic } from "@/lib/dashboard-pdf-cyrillic";
import type { DashboardDayPoint, DashboardStatsPayload } from "@/lib/dashboard-types";
import { formatLagMinutes } from "@/lib/format-lag-minutes";

/** Строка пользователя для экспорта (совпадает с ответом GET /api/admin/users). */
type AdminUserExportRow = {
  id: number;
  login: string;
  role: "admin" | "analyst";
  isBlocked: boolean;
};

const PANEL =
  "rounded-xl border border-white/15 bg-black/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-5";

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

async function buildWorkbook(data: DashboardStatsPayload, adminUsers?: AdminUserExportRow[] | null) {
  const XLSX = await import("xlsx");
  const scopeLabel = data.scope === "all" ? "Все пользователи (админ)" : "Текущий пользователь";
  const lagLine =
    data.bestProfitLag == null
      ? "—"
      : `${formatLagMinutes(data.bestProfitLag.lagMinutes)} · Σ ${data.bestProfitLag.sumResultPercent.toFixed(2)}% · закр. ${data.bestProfitLag.closedCount}`;
  const summaryRows: (string | number)[][] = [
    ["Период", `${data.from} — ${data.to}`],
    ["Область", scopeLabel],
    ["Win (закрытые)", data.win],
    ["Lose (закрытые)", data.lose],
    ["Winrate", formatPct01(data.weightedWinrate)],
    ["Σ %", data.totalResultPercentSum],
    ["Прибыльный горизонт (гор.)", lagLine],
    [],
  ];
  const header = ["Дата", "Winrate %", "Предсказаний", "Новостей", "Σ % дня", "Σ % накопит."];
  const body = data.days.map((d) => [
    d.date,
    d.winrate == null ? "" : (d.winrate * 100).toFixed(2),
    d.predictions,
    d.newsCount,
    d.sumResultPercent,
    d.cumulativeResultPercent,
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

/** Таблица «по дням» с выравниванием колонок (не pipe-текст). */
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
    doc.text("Накоп. %", right - 1.5, hy, { align: "right" });
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
    doc.text(d.date, left + 1.5, y);
    doc.text(wr, 54, y, { align: "right" });
    doc.text(String(d.predictions), 74, y, { align: "right" });
    doc.text(String(d.newsCount), 90, y, { align: "right" });
    doc.text(d.sumResultPercent.toFixed(2), 118, y, { align: "right" });
    doc.text(d.cumulativeResultPercent.toFixed(2), right - 1.5, y, { align: "right" });

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
      : `Прибыльный горизонт: ${formatLagMinutes(data.bestProfitLag.lagMinutes)}, Σ % ${data.bestProfitLag.sumResultPercent.toFixed(2)}, закр. ${data.bestProfitLag.closedCount}`;
  const lines = [
    `Период: ${data.from} — ${data.to}`,
    `Область: ${scopeLabel}`,
    `Win / Lose: ${data.win} / ${data.lose}`,
    `Winrate: ${formatPct01(data.weightedWinrate)}`,
    `Σ %: ${data.totalResultPercentSum}`,
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
  const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

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
      const response = await fetch(
        `/api/dashboard/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
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
  }, [from, to]);

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

  const animKey = `${from}|${to}|${stats?.win ?? 0}-${stats?.lose ?? 0}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/12 bg-[#0c0824]/60 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">Интервал и экспорт</h2>
            <p className="mt-1 text-sm leading-snug text-white/55">
              Предсказания по дате новости.
              {isAdmin ? " Админ: агрегат по всем пользователям." : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="text-white/60">С</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block rounded-lg border border-white/20 bg-[#151046] px-2.5 py-2 text-base text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/60">По</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block rounded-lg border border-white/20 bg-[#151046] px-2.5 py-2 text-base text-white"
                />
              </label>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
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
              className="rounded-full border border-emerald-400/45 bg-emerald-600/25 px-5 py-2.5 text-sm font-semibold text-emerald-50 shadow-sm transition hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Экспорт Excel
            </button>
            <button
              type="button"
              disabled={!stats || exporting}
              onClick={() => void onExport("pdf")}
              className="rounded-full border border-rose-400/45 bg-rose-600/25 px-5 py-2.5 text-sm font-semibold text-rose-50 shadow-sm transition hover:bg-rose-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Экспорт PDF
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-rose-300/90">{error}</p>}
      </div>

      <div
        key={animKey}
        className="grid gap-4 transition-all duration-500 ease-out lg:grid-cols-[min(288px,100%)_1fr] lg:items-stretch"
        style={{ opacity: pending ? 0.55 : 1 }}
      >
        <div className={`${PANEL} flex h-full min-h-0 flex-col`}>
          {stats && (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
                Винрейт
              </p>
              <p className="mt-1.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {formatPct01(stats.weightedWinrate)}
              </p>
              <WinLoseDonut win={stats.win} lose={stats.lose} className="mt-4 max-w-[220px]" />
              <DashboardCompanyPredictBars
                items={stats.companyPredictCounts ?? []}
                bestProfitLag={stats.bestProfitLag ?? null}
                className="mt-3"
              />
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3.5 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-white/55">Σ %</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-cyan-100 sm:text-2xl">
                  {stats.totalResultPercentSum.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
                <p className="mt-1 text-xs leading-snug text-white/50">
                  Сумма по закрытым в интервале
                </p>
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
