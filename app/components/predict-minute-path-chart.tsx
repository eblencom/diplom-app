"use client";

import { useEffect, useMemo, useState } from "react";

type Point = { begin: string; close: number | null };

type Props = {
  predictId: number;
  lagMinutes: number;
};

function lagCaption(lagMinutes: number) {
  const m = Math.round(lagMinutes);
  if (m >= 60 && m % 60 === 0) {
    return `MOEX 1m · ${m / 60} ч`;
  }
  return `MOEX 1m · ${m} мин`;
}

function buildPathSegments(
  points: Point[],
  x: (i: number) => number,
  yOf: (v: number) => number,
): string {
  let d = "";
  let pen = false;
  for (let i = 0; i < points.length; i++) {
    const c = points[i].close;
    if (c === null || !Number.isFinite(c)) {
      pen = false;
      continue;
    }
    const px = x(i);
    const py = yOf(c);
    if (!pen) {
      d += `M${px.toFixed(1)},${py.toFixed(1)}`;
      pen = true;
    } else {
      d += `L${px.toFixed(1)},${py.toFixed(1)}`;
    }
  }
  return d;
}

export function PredictMinutePathChart({ predictId, lagMinutes }: Props) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/predicts/${predictId}/minute-series`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json()) as { points?: Point[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || `HTTP ${response.status}`);
        }
        if (!Array.isArray(payload.points)) {
          throw new Error("bad_payload");
        }
        if (!cancelled) {
          setPoints(payload.points);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "load_failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [predictId]);

  const layout = useMemo(() => {
    if (!points?.length) {
      return null;
    }
    const values = points.map((p) => p.close).filter((v): v is number => v != null && Number.isFinite(v));
    if (values.length === 0) {
      return null;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = span * 0.08;
    const lo = min - pad;
    const hi = max + pad;
    const w = 560;
    const h = 200;
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const n = Math.max(1, points.length - 1);
    const x = (i: number) => padL + (innerW * i) / n;
    const yOf = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
    const path = buildPathSegments(points, x, yOf);
    return { w, h, path, x, yOf, lo, hi, padL, padT, innerW, innerH, first: points[0], last: points[points.length - 1] };
  }, [points]);

  if (error) {
    return (
      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200/90">
        Не удалось загрузить минутный ряд: {error}
      </div>
    );
  }

  if (points === null) {
    return (
      <div className="mt-3 flex h-[200px] items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-950/40 to-black/40 text-xs text-white/50">
        Загрузка минутных цен…
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="mt-3 flex h-[200px] items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-950/40 to-black/40 text-xs text-white/50">
        Нет данных для графика
      </div>
    );
  }

  const { w, h, path, x, yOf, lo, hi, first, last } = layout;
  const fb = first.close;
  const lb = last.close;

  return (
    <div className="mt-3 w-full overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#0c1535]/90 via-[#12082f] to-black/50 p-3 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-200/80">
          {lagCaption(lagMinutes)}
        </p>
        <p className="font-mono text-[11px] text-white/55">
          A {fb != null ? fb.toFixed(2) : "—"} → B {lb != null ? lb.toFixed(2) : "—"}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label="Минутный график цены MOEX между точками A и B"
      >
        <defs>
          <linearGradient id={`stroke-${predictId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="rgb(167, 139, 250)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`fill-${predictId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(15, 10, 45)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const price = lo + (hi - lo) * t;
          const y = yOf(price);
          return (
            <g key={t}>
              <line x1={36} x2={w - 12} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={4} y={y + 3} fill="rgba(255,255,255,0.35)" fontSize="9">
                {price.toFixed(2)}
              </text>
            </g>
          );
        })}
        {path && path.includes("L") ? (
          <>
            <path
              d={`${path} L ${x(points.length - 1).toFixed(1)} ${h - 28} L ${x(0).toFixed(1)} ${h - 28} Z`}
              fill={`url(#fill-${predictId})`}
              opacity={0.9}
            />
            <path
              d={path}
              fill="none"
              stroke={`url(#stroke-${predictId})`}
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : path ? (
          <path
            d={path}
            fill="none"
            stroke={`url(#stroke-${predictId})`}
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {fb != null && (
          <circle cx={x(0)} cy={yOf(fb)} r={5} fill="rgb(34, 211, 238)" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
        )}
        {lb != null && (
          <circle
            cx={x(points.length - 1)}
            cy={yOf(lb)}
            r={5}
            fill="rgb(52, 211, 153)"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />
        )}
        <text x={x(0)} y={h - 8} fill="rgba(255,255,255,0.4)" fontSize="9">
          A
        </text>
        <text x={x(points.length - 1) - 6} y={h - 8} fill="rgba(255,255,255,0.4)" fontSize="9">
          B
        </text>
      </svg>
      <p className="mt-1 text-[10px] text-white/40">Пропуски минут без сделки на MOEX разрывают линию; A и B закреплены по данным предсказания.</p>
    </div>
  );
}
