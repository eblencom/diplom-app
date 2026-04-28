"use client";

import { useEffect, useState } from "react";

type Props = {
  newsId: number;
};

export function NewsPriceBefore({ newsId }: Props) {
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    const startedAt = Date.now();
    const maxWaitMs = 6 * 60 * 1000;

    const tick = async () => {
      if (cancelled) {
        return;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        setError("Не удалось получить цену");
        return;
      }

      try {
        const response = await fetch(`/api/news/${newsId}/price`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          setError("Требуется вход");
          return;
        }

        if (!response.ok) {
          timeoutId = window.setTimeout(() => void tick(), 2000);
          return;
        }

        const payload = (await response.json()) as { price_before: number | null };
        if (typeof payload.price_before === "number" && Number.isFinite(payload.price_before)) {
          setPrice(payload.price_before);
          return;
        }
      } catch {}

      timeoutId = window.setTimeout(() => void tick(), 2000);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [newsId]);

  if (error) {
    return <span className="text-xs text-rose-300">{error}</span>;
  }

  if (price === null) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-white/70">
        <span>Цена на момент выхода новости:</span>
        <span
          className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/90"
          aria-label="Загрузка цены"
        />
      </span>
    );
  }

  return (
    <span className="text-xs text-white/80">
      Цена на момент выхода новости:{" "}
      <span className="font-semibold text-white">{price.toFixed(2)}</span>
    </span>
  );
}
