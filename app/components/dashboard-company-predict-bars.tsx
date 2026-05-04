"use client";

import { CompanyLogo } from "@/app/components/company-logo";
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
  const profitTone =
    bestProfitLag && bestProfitLag.sumProfit < 0
      ? "border-rose-400/25 bg-rose-500/15 text-rose-100"
      : "border-emerald-400/25 bg-emerald-500/15 text-emerald-100";

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 ${className}`}>
      <div className={`rounded-xl border px-4 py-3 ${profitTone}`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Самый прибыльный горизонт
        </p>
        {bestProfitLag ? (
          <>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatLagMinutes(bestProfitLag.lagMinutes)}
            </p>
            <p className="mt-1 text-base leading-snug text-white/75">
              Прибыльность:{" "}
              <span className="font-mono text-lg font-semibold tabular-nums text-white">
                {bestProfitLag.sumProfit.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>{" "}
              прогнозов: {bestProfitLag.closedCount}
            </p>
          </>
        ) : (
          <p className="mt-2 text-base text-white/60">Нет закрытых с profit</p>
        )}
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-white/60">
        Чаще по компаниям
      </p>
      <p className="mt-1 text-sm leading-snug text-white/50">Все прогнозы в интервале</p>
      {shown.length === 0 ? (
        <p className="mt-3 text-base text-white/50">Нет прогнозов.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((row, idx) => {
            const pct = Math.round((row.count / max) * 100);
            const grad = BAR_COLORS[idx % BAR_COLORS.length];
            return (
              <li key={row.ticker} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-base leading-snug">
                  <span className="min-w-0 truncate font-mono font-semibold text-white">{row.ticker}</span>
                  <span className="shrink-0 tabular-nums text-white/75">{row.count}</span>
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
                <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white/55" title={row.name}>
                  <CompanyLogo ticker={row.ticker} name={row.name} size={18} />
                  <span className="truncate">{row.name}</span>
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
