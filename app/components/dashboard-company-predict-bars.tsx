"use client";

import type { DashboardBestProfitLag, DashboardCategoryPredictCount } from "@/lib/dashboard-types";
import { formatLagMinutes } from "@/lib/format-lag-minutes";

const BAR_COLORS = [
  "from-violet-500/90 to-fuchsia-500/75",
  "from-cyan-500/85 to-sky-600/70",
  "from-amber-500/85 to-orange-500/70",
  "from-emerald-500/85 to-teal-600/70",
  "from-rose-500/80 to-pink-500/65",
];

type Props = {
  items: DashboardCategoryPredictCount[];
  bestProfitLag: DashboardBestProfitLag | null;
  className?: string;
};

export function DashboardCompanyPredictBars({ items, bestProfitLag, className = "" }: Props) {
  const max = items.length ? Math.max(...items.map((i) => i.count), 1) : 1;
  const shown = items.slice(0, 10);
  const profitTone =
    bestProfitLag && bestProfitLag.sumProfit < 0
      ? "border-rose-400/25 bg-rose-500/15"
      : "border-emerald-400/25 bg-emerald-500/15";

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 ${className}`}>
      <div className={`rounded-xl border px-4 py-3 ${profitTone}`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Самый результативный горизонт
        </p>
        {bestProfitLag ? (
          <>
            <p className="mt-2 text-3xl font-bold tabular-nums text-white sm:text-4xl">
              {formatLagMinutes(bestProfitLag.lagMinutes)}
            </p>
            <p className="mt-1 text-base leading-snug text-white/75">
              Результативность:{" "}
              <span className="font-mono text-xl font-bold tabular-nums text-white sm:text-2xl">
                {bestProfitLag.sumProfit.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>{" "}
              прогнозов:{" "}
              <span className="font-mono text-lg font-bold tabular-nums text-white">
                {bestProfitLag.closedCount}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-2 text-base text-white/60">Нет закрытых с результативностью</p>
        )}
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-white/60">
        Чаще по категориям
      </p>
      <p className="mt-1 text-sm leading-snug text-white/50">За выбранный период</p>
      {shown.length === 0 ? (
        <p className="mt-3 text-base text-white/50">Нет прогнозов.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((row, idx) => {
            const pct = Math.round((row.count / max) * 100);
            const grad = BAR_COLORS[idx % BAR_COLORS.length];
            return (
              <li key={row.slug} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-base leading-snug">
                  <span className="min-w-0 truncate font-semibold text-white">{row.label}</span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-white">{row.count}</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.07]"
                  title={`${row.label}: ${row.count}`}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${grad}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {row.slug !== "__none" ? (
                  <p className="mt-1 font-mono text-xs text-white/45">{row.slug}</p>
                ) : null}
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
