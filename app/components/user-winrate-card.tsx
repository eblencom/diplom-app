"use client";

import { useCallback, useEffect, useState } from "react";

import type { UserWinrateStats } from "@/lib/user-winrate-model";

const POLL_MS = 4_000;

type Props = {
  initial: UserWinrateStats;
};

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export function UserWinrateCard({ initial }: Props) {
  const [stats, setStats] = useState<UserWinrateStats>(initial);
  const [manualBusy, setManualBusy] = useState(false);

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

  const onManualRefresh = useCallback(async () => {
    setManualBusy(true);
    try {
      await refresh();
    } finally {
      setManualBusy(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const pct = stats.winrate === null ? null : formatPct(stats.winrate);

  return (
    <aside className="rounded-2xl border border-white/15 bg-black/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white/90">Ваш winrate</p>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] text-white/40"
            title={`Автообновление каждые ${POLL_MS / 1000} с`}
          >
            live
          </span>
          <button
            type="button"
            onClick={() => void onManualRefresh()}
            disabled={manualBusy}
            title="Обновить winrate"
            aria-label="Обновить winrate"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={manualBusy ? "animate-spin" : ""}
              aria-hidden
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>
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
