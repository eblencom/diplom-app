"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { WinLoseDonut } from "@/app/components/win-lose-donut";
import type { UserWinrateStats } from "@/lib/user-winrate-model";

const POLL_MS = 4_000;

const PANEL_CLASS =
  "rounded-2xl border border-white/15 bg-black/20 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]";

type Props = {
  initial: UserWinrateStats;
};

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function formatOldestNewsHuman(iso: string | null) {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
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
          companiesCount: typeof next.companiesCount === "number" ? next.companiesCount : 0,
          newsCount: typeof next.newsCount === "number" ? next.newsCount : 0,
          predictsCount: typeof next.predictsCount === "number" ? next.predictsCount : 0,
          oldestNewsAt:
            next.oldestNewsAt === null || typeof next.oldestNewsAt === "string"
              ? next.oldestNewsAt
              : null,
        });
      }
    } catch {}
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
  const oldestHuman = formatOldestNewsHuman(stats.oldestNewsAt);

  return (
    <div className="space-y-4">
      <aside className={PANEL_CLASS}>
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

        <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{pct ?? "—"}</p>

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

        <WinLoseDonut win={stats.win} lose={stats.lose} className="mt-5" />
      </aside>

      <aside className={PANEL_CLASS}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/75">
          Сводка по базе
        </p>
        <ul className="mt-3 space-y-2.5 text-sm">
          <li className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2">
            <span className="text-white/60">Компаний</span>
            <span className="font-mono text-base font-semibold tabular-nums text-cyan-100">
              {stats.companiesCount}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2">
            <span className="text-white/60">Новостей</span>
            <span className="font-mono text-base font-semibold tabular-nums text-cyan-100">
              {stats.newsCount}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-white/60">Предсказаний</span>
            <span className="font-mono text-base font-semibold tabular-nums text-violet-200">
              {stats.predictsCount}
            </span>
          </li>
        </ul>
      </aside>

      <aside className={PANEL_CLASS}>
        <div className="space-y-2">
          {(() => {
            const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? "";
            const name = raw.replace(/^@/, "");
            const href = name ? `https://t.me/${encodeURIComponent(name)}` : null;
            if (href) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-300/55 hover:bg-sky-500/25"
                >
                  Открыть Telegram-бота
                </a>
              );
            }
            return (
              <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-xs text-white/45">
                Укажите <span className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</span> в .env,
                чтобы появилась ссылка на бота.
              </p>
            );
          })()}
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-full border border-violet-400/40 bg-violet-600/15 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:border-violet-300/55 hover:bg-violet-600/25"
          >
            Дашборд
          </Link>
        </div>
      </aside>

      <p className="px-1 text-[11px] leading-relaxed text-white/45">
        *дата старшей новости = {oldestHuman} (дата самой старой новости)
      </p>
    </div>
  );
}
