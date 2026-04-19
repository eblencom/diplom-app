"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminUsersPanel } from "@/app/components/admin-users-panel";
import { DashboardCharts } from "@/app/components/dashboard-charts";
import { DashboardCompanyPredictBars } from "@/app/components/dashboard-company-predict-bars";
import { WinLoseDonut } from "@/app/components/win-lose-donut";
import type { DashboardStatsPayload } from "@/lib/dashboard-types";
import { formatLagMinutes } from "@/lib/format-lag-minutes";

const PANEL =
  "rounded-xl border border-white/15 bg-black/20 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]";

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

async function buildWorkbook(data: DashboardStatsPayload) {
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
    ["Σ result_percent", data.totalResultPercentSum],
    ["Прибыльный горизонт (lag)", lagLine],
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

  return wb;
}

async function exportXlsx(data: DashboardStatsPayload) {
  const XLSX = await import("xlsx");
  const wb = await buildWorkbook(data);
  XLSX.writeFile(wb, `dashboard_${data.from}_${data.to}.xlsx`);
}

async function exportPdf(data: DashboardStatsPayload) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const scopeLabel = data.scope === "all" ? "Все пользователи (админ)" : "Текущий пользователь";
  let y = 12;
  doc.setFontSize(14);
  doc.text("DiplomApp — отчёт дашборда", 14, y);
  y += 10;
  doc.setFontSize(10);
  const lagPdf =
    data.bestProfitLag == null
      ? "Прибыльный горизонт: —"
      : `Прибыльный горизонт: ${formatLagMinutes(data.bestProfitLag.lagMinutes)}, Σ result% ${data.bestProfitLag.sumResultPercent.toFixed(2)}, закр. ${data.bestProfitLag.closedCount}`;
  const lines = [
    `Период: ${data.from} — ${data.to}`,
    `Область: ${scopeLabel}`,
    `Win / Lose: ${data.win} / ${data.lose}`,
    `Winrate: ${formatPct01(data.weightedWinrate)}`,
    `Σ result_percent: ${data.totalResultPercentSum}`,
    lagPdf,
    "",
    "По дням: дата | winrate % | предсказаний | новостей | сумма % дня | накопит. %",
  ];
  for (const line of lines) {
    doc.text(line, 14, y);
    y += 5.5;
  }
  y += 2;
  doc.setFontSize(8);
  for (const d of data.days) {
    const row = `${d.date} | ${d.winrate == null ? "—" : (d.winrate * 100).toFixed(1)}% | ${d.predictions} | ${d.newsCount} | ${d.sumResultPercent.toFixed(2)} | ${d.cumulativeResultPercent.toFixed(2)}`;
    const split = doc.splitTextToSize(row, 182);
    for (const t of split) {
      if (y > 285) {
        doc.addPage();
        y = 12;
      }
      doc.text(t, 14, y);
      y += 4;
    }
  }

  y += 6;
  if (y > 250) {
    doc.addPage();
    y = 12;
  }
  doc.setFontSize(10);
  doc.text("Предсказания по компаниям (тикер)", 14, y);
  y += 7;
  doc.setFontSize(8);
  for (const c of data.companyPredictCounts ?? []) {
    const row = `${c.ticker} — ${c.name} — ${c.count}`;
    const split = doc.splitTextToSize(row, 182);
    for (const t of split) {
      if (y > 285) {
        doc.addPage();
        y = 12;
      }
      doc.text(t, 14, y);
      y += 4;
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
        if (kind === "xlsx") {
          await exportXlsx(stats);
        } else {
          await exportPdf(stats);
        }
      } catch (e) {
        console.error(e);
        setError("Не удалось сформировать файл.");
      } finally {
        setExporting(false);
      }
    },
    [stats],
  );

  const animKey = `${from}|${to}|${stats?.win ?? 0}-${stats?.lose ?? 0}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/12 bg-[#0c0824]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
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
                <p className="text-xs font-medium uppercase tracking-wide text-white/55">
                  Σ result_percent
                </p>
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
