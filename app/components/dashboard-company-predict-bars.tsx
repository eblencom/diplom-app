"use client";

import type { DashboardBestProfitLag, DashboardCompanyPredictCount } from "@/lib/dashboard-types";
import { formatLagMinutes } from "@/lib/format-lag-minutes";

const BAR_COLORS = [
  "from-violet-500/90 to-fuchsia-500/75",
  "from-cyan-500/85 to-sky-600/70",
  "from-amber-500/85 to-orange-500/70",
  "from-emerald-500/85 to-teal-600/70",
  "from-rose-500/80 to-pink-500/65",
];

type Props = {
  items: DashboardCompanyPredictCount[];
  bestProfitLag: DashboardBestProfitLag | null;
  className?: string;
};

export function DashboardCompanyPredictBars({ items, bestProfitLag, className = "" }: Props) {
  const max = items.length ? Math.max(...items.map((i) => i.count), 1) : 1;
  const shown = items.slice(0, 10);

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
        Чаще по компаниям
      </p>
      <p className="mt-1 text-xs leading-snug text-white/45">Все предсказания в интервале</p>
      <div className="mt-3 rounded-md border border-white/[0.08] bg-black/25 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
          Прибыльный горизонт
        </p>
        {bestProfitLag ? (
          <>
            <p className="mt-1 text-base font-semibold text-white">
              {formatLagMinutes(bestProfitLag.lagMinutes)}
            </p>
            <p className="mt-1 text-sm leading-snug text-white/55">
              Σ %:{" "}
              <span className="font-mono tabular-nums text-cyan-100">
                {bestProfitLag.sumProfit.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>{" "}
              · закр. {bestProfitLag.closedCount}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-white/50">Нет закрытых с %</p>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">Нет предсказаний.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((row, idx) => {
            const pct = Math.round((row.count / max) * 100);
            const grad = BAR_COLORS[idx % BAR_COLORS.length];
            return (
              <li key={row.ticker} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-sm leading-snug">
                  <span className="min-w-0 truncate font-mono font-semibold text-white">{row.ticker}</span>
                  <span className="shrink-0 tabular-nums text-white/65">{row.count}</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.07]"
                  title={`${row.name}: ${row.count}`}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${grad}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 truncate text-xs text-white/50" title={row.name}>
                  {row.name}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > shown.length ? (
        <p className="mt-2 text-xs text-white/45">+ещё {items.length - shown.length}</p>
      ) : null}
    </div>
  );
}
