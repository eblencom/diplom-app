"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { ticker: string; name: string; price: string; source: string };

const POLL_MS = 20_000;

type TickerTapeProps = {
  className?: string;
};

export function TickerTape({ className }: TickerTapeProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ticker-tape", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as { items?: Item[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch {
      setError("нет данных");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const extra = className?.trim() ? ` ${className.trim()}` : "";

  if (items.length === 0 && !error) {
    return (
      <div className={`mb-4 h-11 w-full animate-pulse rounded-lg bg-white/5${extra}`} aria-hidden />
    );
  }

  if (items.length === 0 && error) {
    return (
      <div
        className={`mb-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-xs text-white/50${extra}`}
      >
        Котировки: {error}
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div
      className={`mb-6 w-full overflow-hidden rounded-xl border border-emerald-500/25 bg-[#020818]/90 shadow-[inset_0_1px_0_rgba(52,211,153,0.15)]${extra}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-200/80">
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
        Лента котировок
      </div>
      <div className="relative h-11 overflow-hidden">
        <div
          className="ticker-marquee-track flex w-max items-center gap-10 whitespace-nowrap py-2 pl-4 text-sm"
          style={{
            animation: `ticker-marquee ${Math.max(28, items.length * 6)}s linear infinite`,
          }}
        >
          {doubled.map((it, idx) => (
            <span key={`${it.ticker}-${idx}`} className="inline-flex items-baseline gap-2 font-mono">
              <span className="font-semibold text-emerald-200/95">{it.ticker}</span>
              <span className="text-white/90">{it.price}</span>
              <span className="text-[10px] text-white/35">{it.name.slice(0, 18)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
