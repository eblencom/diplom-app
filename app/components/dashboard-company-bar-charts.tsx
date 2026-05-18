"use client";

import { CompanyLogo } from "@/app/components/company-logo";
import type { DashboardCompanyNewsCount, DashboardCompanyPredictCount } from "@/lib/dashboard-types";
import { formatDisplayYmd } from "@/lib/display-date";

const PLOT_H = 240;
const BAR_TOP_RESERVE = 14;

function maxPos(values: number[]): number {
  return Math.max(1, ...values, 0);
}

function niceCeil(x: number): number {
  if (!Number.isFinite(x) || x <= 0) {
    return 1;
  }
  const pow10 = 10 ** Math.floor(Math.log10(x));
  const n = x / pow10;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow10;
}

type CompanyRow = { ticker: string; name: string; count: number };

function CompanyColumnChart({
  title,
  subtitle,
  items,
  barClass,
}: {
  title: string;
  subtitle: string;
  items: CompanyRow[];
  barClass: string;
}) {
  const shown = items.filter((i) => i.count > 0);
  const maxY = niceCeil(maxPos(shown.map((i) => i.count)));
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => maxY - (i / tickCount) * maxY);
  const gapPx = 6;
  const colMin = 26;
  const trackMin =
    shown.length > 0
      ? shown.length * colMin + Math.max(0, shown.length - 1) * gapPx
      : 280;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-white/12 bg-black/30 p-4 sm:p-5">
        <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        <p className="mt-1 text-base leading-snug text-white/55">{subtitle}</p>
        <p className="mt-6 text-base text-white/50">Нет данных за период.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/12 bg-black/30 p-4 sm:p-5">
      <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
      <p className="mt-1 text-base leading-snug text-white/55">{subtitle}</p>
      <div className="mt-3 flex gap-2">
        <div
          className="flex shrink-0 flex-col justify-between py-1 text-right text-base font-semibold leading-none text-white"
          style={{ width: 52, height: PLOT_H }}
        >
          {ticks.map((t) => (
            <span key={t} className="tabular-nums">
              {Math.round(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div
            className="flex flex-col"
            style={{ width: "100%", minWidth: `${Math.max(trackMin, 280)}px` }}
          >
            <div
              className="relative w-full rounded border border-white/10 bg-[#05021b]/50 px-1 pt-1 pb-1"
              style={{ height: PLOT_H }}
            >
              {ticks.map((_, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute left-1 right-1 border-t border-white/[0.08]"
                  style={{ bottom: `${(i / tickCount) * 100}%` }}
                />
              ))}
              <div className="relative z-[1] flex h-full w-full items-end justify-start gap-1.5">
                {shown.map((row) => {
                  const h = Math.max(
                    row.count === 0 ? 2 : 3,
                    Math.round((row.count / maxY) * (PLOT_H - BAR_TOP_RESERVE)),
                  );
                  return (
                    <div
                      key={row.ticker}
                      className="group flex h-full min-w-[26px] flex-1 flex-col items-center justify-end"
                      title={`${row.name}: ${row.count}`}
                    >
                      <span className="mb-0.5 text-sm font-bold tabular-nums text-white">
                        {row.count}
                      </span>
                      <div
                        className={`w-full rounded-t transition-[height] duration-500 ease-out ${barClass}`}
                        style={{ height: h }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex w-full gap-1.5 border-t border-white/[0.08] px-1 pt-2">
              {shown.map((row) => (
                <div
                  key={row.ticker}
                  className="flex min-w-[26px] flex-1 flex-col items-center gap-1"
                  title={row.name}
                >
                  <CompanyLogo ticker={row.ticker} name={row.name} size={20} />
                  <span className="truncate text-xs font-mono font-bold text-white">
                    {row.ticker}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  fromYmd: string;
  toYmd: string;
  scopeLabel: string;
  newsItems: DashboardCompanyNewsCount[];
  predictItems: DashboardCompanyPredictCount[];
  className?: string;
};

export function DashboardCompanyBarCharts({
  fromYmd,
  toYmd,
  scopeLabel,
  newsItems,
  predictItems,
  className = "",
}: Props) {
  const period = `${formatDisplayYmd(fromYmd)} — ${formatDisplayYmd(toYmd)}`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <CompanyColumnChart
        title="Новости по компаниям"
        subtitle={`Опубликовано за период ${period}. Все пользователи (объём новостей на рынке).`}
        items={newsItems}
        barClass="bg-sky-400/85"
      />
      <CompanyColumnChart
        title="Прогнозы по компаниям"
        subtitle={`Прогнозы за период ${period}. Область: ${scopeLabel}.`}
        items={predictItems}
        barClass="bg-violet-400/85"
      />
    </div>
  );
}
