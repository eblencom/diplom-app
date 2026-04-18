"use client";

import { useCallback, useEffect, useState } from "react";

import type { UserWinrateStats } from "@/lib/user-winrate-model";

const POLL_MS = 15_000;

type Props = {
  initial: UserWinrateStats;
};

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export function UserWinrateCard({ initial }: Props) {
  const [stats, setStats] = useState<UserWinrateStats>(initial);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/user/winrate", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const next = (await response.json()) as UserWinrateStats;
      if (
        typeof next.win === "number" &&
        typeof next.lose === "number" &&
        typeof next.total === "number"
      ) {
        setStats({
          win: next.win,
          lose: next.lose,
          total: next.total,
          winrate:
            next.winrate === null || typeof next.winrate === "number"
              ? next.winrate
              : null,
        });
      }
    } catch {
      // сеть / временные ошибки
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const pct = stats.winrate === null ? null : formatPct(stats.winrate);

  return (
    <aside className="rounded-2xl border border-white/15 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white/90">Ваш winrate</p>
        <span className="text-[10px] text-white/40" title="Автообновление каждые 15 с">
          live
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {pct ?? "—"}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/55">Win</div>
          <div className="mt-1 font-mono text-base text-emerald-200">{stats.win}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/55">Lose</div>
          <div className="mt-1 font-mono text-base text-rose-200">{stats.lose}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/55">W:L</div>
          <div className="mt-1 font-mono text-base text-white/85">
            {stats.total > 0 ? `${stats.win}:${stats.lose}` : "—"}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/55">
        Считается по закрытым предсказаниям с результатом win/lose (neutral не
        учитывается).
      </p>
    </aside>
  );
}
