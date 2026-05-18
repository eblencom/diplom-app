"use client";

import type { DashboardStatsPayload } from "@/lib/dashboard-types";
import { formatDisplayYmd } from "@/lib/display-date";

function formatSignedPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

type Props = {
  stats: DashboardStatsPayload;
  className?: string;
};

export function DashboardVisualSummary({ stats, className = "" }: Props) {
  const summary = stats.visualSummary;
  const items = [
    {
      title: "Всего прогнозов",
      value: summary.totalPredictions.toLocaleString("ru-RU"),
      className: "border-violet-400/25 bg-violet-500/15",
    },
    {
      title: "Самая большая положительная результативность",
      value: formatSignedPercent(summary.bestPositiveProfit),
      className: "border-emerald-400/25 bg-emerald-500/15",
    },
    {
      title: "Самая большая отрицательная результативность",
      value: formatSignedPercent(summary.worstNegativeProfit),
      className: "border-rose-400/25 bg-rose-500/15",
    },
    {
      title: "День с максимальным количеством опубликованных новостей",
      value: summary.busiestNewsDay
        ? `${formatDisplayYmd(summary.busiestNewsDay.date)} · ${summary.busiestNewsDay.newsCount}`
        : "—",
      className: "border-sky-400/25 bg-sky-500/15",
    },
  ];

  return (
    <div
      className={`flex flex-col rounded-xl border border-white/12 bg-black/30 p-3.5 sm:p-4 ${className}`}
    >
      <h3 className="text-center text-xl font-semibold leading-snug text-white sm:text-2xl">
        Визуальная сводка
      </h3>
      <div className="mt-3 grid gap-2.5">
        {items.map((item) => (
          <div key={item.title} className={`rounded-2xl border px-3.5 py-2.5 ${item.className}`}>
            <p className="text-sm font-medium leading-snug text-white/75">{item.title}</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-white sm:text-3xl">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
