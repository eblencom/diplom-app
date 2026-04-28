"use client";

import { useId } from "react";

import type { DashboardDayPoint, DashboardStatsPayload } from "@/lib/dashboard-types";

const PLOT_H = 168;
const BAR_TOP_RESERVE = 10;
const Y_AXIS_W = 40;

function maxPos(values: number[]): number {
  return Math.max(1, ...values, 1e-9);
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

function shortDateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) {
    return iso;
  }
  return `${d}.${m}`;
}

function xAxisLabelClass(nDays: number): string {
  const size = nDays > 24 ? "text-[9px]" : nDays > 14 ? "text-[10px]" : "text-xs";
  return `block max-w-full truncate text-center leading-tight text-white/60 tabular-nums ${size}`;
}

type ColumnChartProps = {
  title: string;
  subtitle?: string;
  days: DashboardDayPoint[];
  maxY: number;
  barHeight: (d: DashboardDayPoint) => number;
  valueOnBar: (d: DashboardDayPoint) => string;
  tickFormat: (v: number) => string;
  barClass: string;
};

function ColumnChart({
  title,
  subtitle,
  days,
  maxY,
  barHeight,
  valueOnBar,
  tickFormat,
  barClass,
}: ColumnChartProps) {
  const tickCount = 4;
  const step = maxY / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => maxY - i * step);
  const xLabelCls = xAxisLabelClass(days.length);
  const tiltX = days.length > 10;

  return (
    <div className="rounded-xl border border-white/12 bg-black/30 p-3 sm:p-3.5">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs leading-snug text-white/50">{subtitle}</p> : null}
      <div className="mt-2 flex gap-1.5">
        <div
          className="flex shrink-0 flex-col justify-between py-1 text-right text-[11px] leading-none text-white/50"
          style={{ width: Y_AXIS_W, height: PLOT_H }}
        >
          {ticks.map((t) => (
            <span key={t} className="tabular-nums">
              {tickFormat(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative rounded border border-white/10 bg-[#05021b]/50" style={{ height: PLOT_H }}>
            {ticks.map((_, i) => (
              <div
                key={i}
                className="pointer-events-none absolute left-0 right-0 border-t border-white/[0.08]"
                style={{ bottom: `${(i / tickCount) * 100}%` }}
              />
            ))}
            <div className="absolute inset-x-0.5 inset-y-1 flex items-stretch gap-px">
              {days.map((d) => {
                const h = barHeight(d);
                return (
                  <div
                    key={d.date}
                    className="group flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-end border-l border-white/[0.06] first:border-l-0"
                    title={`${d.date}: ${valueOnBar(d)}`}
                  >
                    <div
                      className={`w-full max-w-[12px] rounded-t transition-[height] duration-500 ease-out ${barClass}`}
                      style={{ height: Math.max(2, h) }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="mt-1 flex justify-between gap-px"
            style={{ paddingLeft: 0, minHeight: tiltX ? "2.6rem" : undefined }}
          >
            {days.map((d) => (
              <div
                key={`x-${d.date}`}
                className="flex min-w-0 flex-1 flex-col items-center justify-start"
              >
                <span
                  className={xLabelCls}
                  style={{
                    transform: tiltX ? "rotate(-52deg)" : undefined,
                    transformOrigin: "top center",
                  }}
                >
                  {shortDateLabel(d.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WinrateBarBlock({ days }: { days: DashboardDayPoint[] }) {
  const values = days.map((d) => (d.winrate == null ? 0 : d.winrate * 100));
  const maxV = Math.max(100, ...values, 1e-9);
  return (
    <ColumnChart
      title="Винрейт по дням"
      subtitle="Доля win среди win+lose, %"
      days={days}
      maxY={maxV}
      barHeight={(d) => {
        const pct = d.winrate == null ? 0 : d.winrate * 100;
        return Math.max(d.winrate == null ? 2 : 3, Math.round((pct / maxV) * (PLOT_H - BAR_TOP_RESERVE)));
      }}
      valueOnBar={(d) => (d.winrate == null ? "—" : `${(d.winrate * 100).toFixed(0)}%`)}
      tickFormat={(v) => `${Math.round(v)}`}
      barClass="bg-emerald-400/85"
    />
  );
}

function CountBarBlock({
  title,
  subtitle,
  days,
  getValue,
  colorClass,
}: {
  title: string;
  subtitle: string;
  days: DashboardDayPoint[];
  getValue: (d: DashboardDayPoint) => number;
  colorClass: string;
}) {
  const values = days.map(getValue);
  const maxV = niceCeil(maxPos(values));
  return (
    <ColumnChart
      title={title}
      subtitle={subtitle}
      days={days}
      maxY={maxV}
      barHeight={(d) => {
        const raw = getValue(d);
        return Math.max(raw === 0 ? 2 : 3, Math.round((raw / maxV) * (PLOT_H - BAR_TOP_RESERVE)));
      }}
      valueOnBar={(d) => String(getValue(d))}
      tickFormat={(v) => String(Math.round(v))}
      barClass={colorClass}
    />
  );
}

function DailyPercentBars({
  days,
  title,
  subtitle,
  getValue,
}: {
  days: DashboardDayPoint[];
  title: string;
  subtitle: string;
  getValue: (d: DashboardDayPoint) => number;
}) {
  const vals = days.map(getValue);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(0, ...vals, minV + 1e-6);
  const span = maxV - minV || 1;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = maxV - (i / tickCount) * (maxV - minV);
    return t;
  });
  const xLabelCls = xAxisLabelClass(days.length);
  const tiltX = days.length > 10;

  return (
    <div className="rounded-xl border border-white/12 bg-black/30 p-3 sm:p-3.5">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="mt-1 text-xs leading-snug text-white/50">{subtitle}</p>
      <div className="mt-2 flex gap-1.5">
        <div
          className="flex shrink-0 flex-col justify-between py-1 text-right text-[11px] leading-none text-white/50"
          style={{ width: Y_AXIS_W, height: PLOT_H }}
        >
          {ticks.map((t) => (
            <span key={t} className="tabular-nums">
              {t.toFixed(0)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative rounded border border-white/10 bg-[#05021b]/50" style={{ height: PLOT_H }}>
            {ticks.map((_, i) => (
              <div
                key={i}
                className="pointer-events-none absolute left-0 right-0 border-t border-white/[0.08]"
                style={{ bottom: `${(i / tickCount) * 100}%` }}
              />
            ))}
            <div className="absolute inset-x-0.5 inset-y-1 flex items-stretch gap-px">
              {days.map((d) => {
                const raw = getValue(d);
                const barPx = Math.max(3, Math.round(((raw - minV) / span) * (PLOT_H - BAR_TOP_RESERVE)));
                return (
                  <div
                    key={d.date}
                    className="group flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-end border-l border-white/[0.06] first:border-l-0"
                    title={`${d.date}: ${raw.toFixed(2)}%`}
                  >
                    <div
                      className={`w-full max-w-[12px] rounded-t transition-[height] duration-500 ease-out ${
                        raw >= 0 ? "bg-emerald-400/90" : "bg-rose-500/90"
                      }`}
                      style={{ height: barPx }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="mt-1 flex justify-between gap-px"
            style={{ minHeight: tiltX ? "2.6rem" : undefined }}
          >
            {days.map((d) => (
              <div key={`xp-${d.date}`} className="flex min-w-0 flex-1 flex-col items-center">
                <span
                  className={xLabelCls}
                  style={{
                    transform: tiltX ? "rotate(-52deg)" : undefined,
                    transformOrigin: "top center",
                  }}
                >
                  {shortDateLabel(d.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const RESULT_CHART_CAPTION =
  "График показателя результата в % за выбранный интервал";

function CumulativeLineChart({
  days,
  title,
  getValue,
  className = "",
}: {
  days: DashboardDayPoint[];
  title: string;
  getValue: (d: DashboardDayPoint) => number;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const vals = days.map(getValue);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(0, ...vals);
  const span = Math.max(1e-9, maxV - minV);
  const plotW = Math.max(560, Math.min(1040, 96 + days.length * 18));
  const plotH = 320;
  const padL = 14;
  const padR = 14;
  const padT = 14;
  const padB = 14;
  const innerW = plotW - padL - padR;
  const innerH = plotH - padT - padB;
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => maxV - (i / tickCount) * span);

  const pts = days.map((d, i) => {
    const x = padL + (i / Math.max(1, days.length - 1)) * innerW;
    const y = padT + ((maxV - getValue(d)) / span) * innerH;
    return { x, y, d, i };
  });
  const dPath = pts.length ? `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col rounded-xl border border-white/12 bg-black/30 p-3 sm:p-4 ${className}`}
    >
      <h3 className="text-center text-sm font-medium leading-snug text-white/85 sm:text-[15px]">
        {title}
      </h3>
      <div className="mt-3 min-h-0 flex-1 overflow-x-auto">
        <svg
          width={plotW}
          height={plotH}
          viewBox={`0 0 ${plotW} ${plotH}`}
          className="mx-auto block min-h-[260px] w-full max-w-full text-white/50 sm:min-h-[280px]"
          aria-label={title}
        >
          {yTicks.map((yt, i) => {
            const y = padT + ((maxV - yt) / span) * innerH;
            return (
              <line
                key={`h-${i}`}
                x1={padL}
                y1={y}
                x2={plotW - padR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
            );
          })}
          {pts.map(({ x, i }) => (
            <line
              key={`vg-${i}`}
              x1={x}
              y1={padT}
              x2={x}
              y2={plotH - padB}
              stroke="currentColor"
              strokeOpacity={0.06}
            />
          ))}
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(167 139 250)" stopOpacity="1" />
            </linearGradient>
          </defs>
          {dPath ? (
            <path
              d={dPath}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="3.5"
              className="transition-all duration-500 ease-out"
            />
          ) : null}
          {pts.map(({ x, y, d }) => (
            <circle key={d.date} cx={x} cy={y} r="4" className="fill-cyan-200/95" />
          ))}
        </svg>
      </div>
    </div>
  );
}

type Props = {
  stats: DashboardStatsPayload;
  className?: string;
};

export function DashboardCharts({ stats, className = "" }: Props) {
  const { days } = stats;
  if (days.length === 0) {
    return <p className="text-base text-white/60">Нет дат в выбранном диапазоне.</p>;
  }

  return (
    <div className={`flex h-full min-h-0 flex-col gap-2 ${className}`}>
      <div className="grid shrink-0 gap-2 sm:grid-cols-2">
        <WinrateBarBlock days={days} />
        <CountBarBlock
          title="Предсказания"
          subtitle="Закрытых за день"
          days={days}
          getValue={(d) => d.predictions}
          colorClass="bg-violet-400/85"
        />
        <CountBarBlock
          title="Новости"
          subtitle="Опубликовано за день"
          days={days}
          getValue={(d) => d.newsCount}
          colorClass="bg-sky-400/85"
        />
        <DailyPercentBars
          days={days}
          title="Σ % по дням"
          subtitle="Сумма result_percent за день"
          getValue={(d) => d.sumResultPercent}
        />
        <DailyPercentBars
          days={days}
          title="Profit по дням"
          subtitle="Сумма profit за день"
          getValue={(d) => d.sumProfit}
        />
      </div>
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-2">
        <CumulativeLineChart
          days={days}
          title={RESULT_CHART_CAPTION}
          getValue={(d) => d.cumulativeResultPercent}
          className="min-h-[300px] flex-1 lg:min-h-[340px]"
        />
        <CumulativeLineChart
          days={days}
          title="График profit в % за выбранный интервал"
          getValue={(d) => d.cumulativeProfit}
          className="min-h-[300px] flex-1 lg:min-h-[340px]"
        />
      </div>
    </div>
  );
}
