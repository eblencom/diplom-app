"use client";

import { useId, useMemo } from "react";

import type { DashboardAdminUserActivity, DashboardUserActivityPoint } from "@/lib/dashboard-types";
import { formatDisplayYmd } from "@/lib/display-date";

const WINDOW_OPTIONS = [7, 14, 30] as const;

function niceCeil(x: number): number {
  if (!Number.isFinite(x) || x <= 0) {
    return 1;
  }
  const pow10 = 10 ** Math.floor(Math.log10(x));
  const n = x / pow10;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow10;
}

type Props = {
  activity: DashboardAdminUserActivity;
  activityDays: number;
  onActivityDaysChange: (days: number) => void;
  disabled?: boolean;
  className?: string;
};

function buildComboLayout(points: DashboardUserActivityPoint[]) {
  const n = points.length;
  const PAD = { l: 54, r: 58, t: 30, b: 60 };
  const vbW = 1100;
  const vbH = 320;
  const chartW = vbW - PAD.l - PAD.r;
  const chartH = vbH - PAD.t - PAD.b;

  const maxU = niceCeil(Math.max(1, ...points.map((p) => p.activeUsers)));
  const maxP = niceCeil(Math.max(1, ...points.map((p) => p.predictCount)));

  const cellW = n > 0 ? chartW / n : chartW;
  const cx = (i: number) => PAD.l + (i + 0.5) * cellW;
  const barW = Math.min(20, cellW * 0.5);
  const yU = (u: number) => PAD.t + chartH - (u / maxU) * chartH;
  const yP = (p: number) => PAD.t + chartH - (p / maxP) * chartH;

  const linePath =
    n > 0
      ? points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i)},${yP(p.predictCount)}`)
          .join(" ")
      : "";

  const ticksU = 4;
  const yTicksU = Array.from({ length: ticksU + 1 }, (_, i) => (maxU * (ticksU - i)) / ticksU);
  const ticksP = 4;
  const yTicksP = Array.from({ length: ticksP + 1 }, (_, i) => (maxP * (ticksP - i)) / ticksP);

  return {
    vbW,
    vbH,
    PAD,
    maxU,
    maxP,
    cellW,
    cx,
    barW,
    yU,
    yP,
    linePath,
    yTicksU,
    yTicksP,
  };
}

export function DashboardAdminUserActivityChart({
  activity,
  activityDays,
  onActivityDaysChange,
  disabled = false,
  className = "",
}: Props) {
  const points = activity.points;
  const gradId = useId().replace(/:/g, "");

  const L = useMemo(() => buildComboLayout(points), [points]);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col rounded-xl border border-white/12 bg-[#0a0820]/85 p-4 sm:p-5 ${className}`}
    >
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white sm:text-2xl">Активность пользователей</h3>
          <p className="mt-1 max-w-3xl text-sm leading-snug text-white/65 sm:text-base">
            Столбцы — уникальные пользователи с прогнозом за день; линия — всего прогнозов.
          </p>
        </div>
        <label className="flex shrink-0 flex-col gap-1 text-sm text-white/75">
          <span className="font-medium">Число дней (N)</span>
          <select
            value={activityDays}
            disabled={disabled}
            onChange={(e) => onActivityDaysChange(Number(e.target.value))}
            className="rounded-lg border border-white/20 bg-[#151046] px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-cyan-500/35 disabled:opacity-50"
          >
            {WINDOW_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} дней
              </option>
            ))}
          </select>
        </label>
      </div>

      {points.length === 0 ? (
        <p className="mt-6 shrink-0 text-base text-white/50">Нет данных.</p>
      ) : (
        <div className="mt-4 min-h-0 w-full flex-1">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-3 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-sm bg-slate-400/95" aria-hidden />
              Уникальные пользователи (ось слева)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-0.5 w-7 bg-cyan-400" aria-hidden />
              Всего прогнозов (ось справа)
            </span>
          </div>
          <div className="mt-3 min-h-0 w-full">
            <div className="aspect-[1100/320] w-full min-h-[220px]">
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${L.vbW} ${L.vbH}`}
                preserveAspectRatio="xMidYMid meet"
                className="block h-full w-full text-white"
                role="img"
                aria-label="Активность пользователей: уникальные пользователи и прогнозы по дням"
              >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(148 163 184)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="rgb(71 85 105)" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {L.yTicksU.map((tv, i) => {
                const y = L.yU(tv);
                return (
                  <g key={`gu-${i}`}>
                    <line
                      x1={L.PAD.l}
                      y1={y}
                      x2={L.vbW - L.PAD.r}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.1}
                    />
                    <text x={L.PAD.l - 6} y={y + 5} textAnchor="end" className="fill-white text-[13px] font-semibold tabular-nums">
                      {Math.round(tv)}
                    </text>
                  </g>
                );
              })}

              {L.yTicksP.map((tv, i) => {
                const y = L.yP(tv);
                return (
                  <text
                    key={`gp-${i}`}
                    x={L.vbW - L.PAD.r + 8}
                    y={y + 4}
                    textAnchor="start"
                    className="fill-white text-[13px] font-semibold tabular-nums"
                  >
                    {Math.round(tv)}
                  </text>
                );
              })}

              <text
                x={L.PAD.l - 4}
                y={L.PAD.t - 8}
                textAnchor="end"
                className="fill-white text-[12px] font-medium"
              >
                люди
              </text>
              <text
                x={L.vbW - L.PAD.r + 4}
                y={L.PAD.t - 8}
                textAnchor="start"
                className="fill-white text-[12px] font-medium"
              >
                прогнозы
              </text>

              {points.map((p, i) => {
                const x = L.cx(i);
                const yb = L.yU(p.activeUsers);
                const h = L.yU(0) - yb;
                return (
                  <rect
                    key={p.date}
                    x={x - L.barW / 2}
                    y={yb}
                    width={L.barW}
                    height={Math.max(h, 1)}
                    rx={3}
                    fill={`url(#${gradId})`}
                  >
                    <title>
                      {formatDisplayYmd(p.date)}: пользователей {p.activeUsers}, прогнозов{" "}
                      {p.predictCount}
                    </title>
                  </rect>
                );
              })}

              {L.linePath ? (
                <path
                  d={L.linePath}
                  fill="none"
                  stroke="rgb(34 211 238)"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                />
              ) : null}

              {points.map((p, i) => (
                <circle
                  key={`dot-${p.date}`}
                  cx={L.cx(i)}
                  cy={L.yP(p.predictCount)}
                  r={3.5}
                  className="fill-cyan-200 stroke-[#0a0820] stroke-[1.2]"
                >
                  <title>
                    {formatDisplayYmd(p.date)}: прогнозов {p.predictCount}, пользователей{" "}
                    {p.activeUsers}
                  </title>
                </circle>
              ))}

              {points.map((p, i) => {
                const x = L.cx(i);
                const parts = p.date.split("-");
                const da = parts[2] ?? "";
                const mo = parts[1] ?? "";
                const yy = parts[0]?.slice(2) ?? "";
                const short = points.length > 18 ? `${da}.${mo}` : `${da}.${mo}.${yy}`;
                const rot = points.length > 14 ? -50 : 0;
                const ty = L.vbH - (points.length > 14 ? 24 : 12);
                return (
                  <text
                    key={`xl-${p.date}`}
                    x={x}
                    y={ty}
                    textAnchor="middle"
                    transform={rot !== 0 ? `rotate(${rot}, ${x}, ${ty})` : undefined}
                    className="fill-white text-[11px] font-semibold tabular-nums sm:text-[12px]"
                  >
                    {short}
                  </text>
                );
              })}
            </svg>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 min-h-8 flex-1" aria-hidden />
    </div>
  );
}
