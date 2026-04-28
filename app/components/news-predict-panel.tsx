"use client";

import { useEffect, useMemo, useState } from "react";

import { PredictMinutePathChart } from "@/app/components/predict-minute-path-chart";
import {
  DEFAULT_LAG_MINUTES,
  LAG_PRESETS,
  PREDICT_CLIENT_POLL_MS,
  predictPollMaxWaitMs,
} from "@/lib/predict-lag";
import type { UserPredictOnNews } from "@/lib/predicts-types";

type Props = {
  newsId: number;
  initialPredicts: UserPredictOnNews[];
};

function predictionLabel(p: UserPredictOnNews["prediction"]) {
  if (p === "positive") {
    return "Позитивное";
  }
  if (p === "negative") {
    return "Негативное";
  }
  return "Нейтральное";
}

function predictionTextClass(p: UserPredictOnNews["prediction"]) {
  if (p === "positive") {
    return "font-semibold text-emerald-400";
  }
  if (p === "negative") {
    return "font-semibold text-rose-400";
  }
  return "font-semibold text-[#ede6d9]";
}

function resultLabel(result: UserPredictOnNews["result"]) {
  if (result === "win") {
    return "Успешный";
  }
  if (result === "lose") {
    return "Неуспешный";
  }
  if (result === "neutral") {
    return "Нейтральный исход";
  }
  return null;
}

function resultTextClass(result: UserPredictOnNews["result"]) {
  if (result === "win") {
    return "font-semibold text-emerald-400";
  }
  if (result === "lose") {
    return "font-semibold text-rose-400";
  }
  if (result === "neutral") {
    return "font-semibold text-[#e8dcc8]";
  }
  return "font-semibold text-white/80";
}

function formatWaitHorizon(lagMinutes: number) {
  const m = Math.round(lagMinutes);
  if (m >= 60 && m % 60 === 0) {
    const h = m / 60;
    return `${h} ч`;
  }
  return `${m} мин`;
}

export function NewsPredictPanel({ newsId, initialPredicts }: Props) {
  const [predicts, setPredicts] = useState<UserPredictOnNews[]>(initialPredicts);
  const [lagMinutes, setLagMinutes] = useState(DEFAULT_LAG_MINUTES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedLags = useMemo(() => {
    const s = new Set<number>();
    for (const p of predicts) {
      s.add(Math.round(p.lagMinutes));
    }
    return s;
  }, [predicts]);

  const canAddMore = LAG_PRESETS.some((m) => !usedLags.has(m));

  useEffect(() => {
    setPredicts(initialPredicts);
  }, [initialPredicts]);

  useEffect(() => {
    if (!usedLags.has(lagMinutes)) {
      return;
    }
    const next = LAG_PRESETS.find((m) => !usedLags.has(m));
    if (next !== undefined) {
      setLagMinutes(next);
    }
  }, [usedLags, lagMinutes]);

  const expectIdsKey = useMemo(() => {
    return predicts
      .filter((p) => p.status === "expect")
      .map((p) => p.id)
      .sort()
      .join(",");
  }, [predicts]);

  useEffect(() => {
    const expecting = predicts.filter((p) => p.status === "expect");
    if (expecting.length === 0) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    const startedAt = Date.now();
    const maxWaitMs = Math.max(...expecting.map((p) => predictPollMaxWaitMs(p.lagMinutes)));

    const tick = async () => {
      if (cancelled) {
        return;
      }
      if (Date.now() - startedAt > maxWaitMs) {
        return;
      }

      try {
        const response = await fetch(`/api/news/${newsId}/predict`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          timeoutId = window.setTimeout(() => void tick(), PREDICT_CLIENT_POLL_MS);
          return;
        }
        const payload = (await response.json()) as { predicts?: UserPredictOnNews[] };
        const next = payload.predicts;
        if (Array.isArray(next)) {
          setPredicts(next);
          if (!next.some((p) => p.status === "expect")) {
            return;
          }
        }
      } catch {}

      timeoutId = window.setTimeout(() => void tick(), PREDICT_CLIENT_POLL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [newsId, expectIdsKey]);

  const onAddPredict = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/news/${newsId}/predict`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lagMinutes }),
      });
      if (response.status === 409) {
        setError("Уже есть предсказание с этим горизонтом");
        return;
      }
      if (response.status === 400) {
        setError("Недопустимый горизонт");
        return;
      }
      if (!response.ok) {
        setError("Не удалось сохранить предсказание");
        return;
      }
      const payload = (await response.json()) as { predicts?: UserPredictOnNews[] };
      if (Array.isArray(payload.predicts)) {
        setPredicts(payload.predicts);
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (predictId: number) => {
    setError(null);
    try {
      const response = await fetch(`/api/predicts/${predictId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError("Не удалось удалить");
        return;
      }
      setPredicts((prev) => prev.filter((p) => p.id !== predictId));
    } catch {
      setError("Ошибка сети");
    }
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-base font-medium text-white/75">Новое предсказание</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm text-white/60">
            Горизонт
            <select
              value={lagMinutes}
              onChange={(e) => setLagMinutes(Number(e.target.value))}
              disabled={!canAddMore}
              className="rounded-lg border border-white/20 bg-[#151046] px-3.5 py-2.5 text-base text-white outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
            >
              {LAG_PRESETS.map((m) => (
                <option key={m} value={m} disabled={usedLags.has(m)}>
                  {m >= 60 && m % 60 === 0 ? `${m / 60} ч (${m} мин)` : `${m} мин`}
                  {usedLags.has(m) ? " — уже есть" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !canAddMore || usedLags.has(lagMinutes)}
            onClick={() => void onAddPredict()}
            className="rounded-full border border-violet-400/50 bg-violet-500/20 px-5 py-2.5 text-base text-violet-100 transition hover:bg-violet-500/30 disabled:opacity-50 sm:ml-auto"
          >
            {busy ? "Сохранение…" : "Предсказать"}
          </button>
        </div>
        {!canAddMore && (
          <p className="text-sm text-white/45">
            Все доступные горизонты уже использованы для этой новости. Удалите лишнее, чтобы
            добавить снова.
          </p>
        )}
      </div>

      {predicts.length > 0 && (
        <ul className="mt-5 space-y-5">
          {predicts.map((predict) => {
            const closedCardClass =
              predict.status === "closed"
                ? predict.result === "win"
                  ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/35 via-[#0c1810]/75 to-black/35"
                  : predict.result === "lose"
                    ? "border-rose-500/30 bg-gradient-to-br from-rose-950/35 via-[#18080c]/75 to-black/35"
                    : predict.result === "neutral"
                      ? "border-[#e8e0d4]/22 bg-gradient-to-br from-[#f4efe6]/[0.08] via-[#0f0828]/70 to-black/30"
                      : "border-violet-500/20 bg-gradient-to-br from-black/40 via-[#0f0828]/80 to-violet-950/25"
                : "border-violet-500/20 bg-gradient-to-br from-black/40 via-[#0f0828]/80 to-violet-950/25";

            return (
            <li
              key={predict.id}
              className={`rounded-xl border p-4 text-base shadow-inner shadow-black/20 ${closedCardClass}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-base text-white/85">
                  <span className="text-white/55">Тональность: </span>
                  <span className={predictionTextClass(predict.prediction)}>
                    {predictionLabel(predict.prediction)}
                  </span>
                  <span className="ml-2 text-sm text-white/45">
                    · горизонт {formatWaitHorizon(predict.lagMinutes)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(predict.id)}
                  className="text-sm text-rose-300/90 underline-offset-2 hover:text-rose-200 hover:underline"
                >
                  Удалить
                </button>
              </div>

              {predict.status === "expect" ? (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/60">
                  <span
                    className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-violet-400"
                    aria-hidden
                  />
                  Ожидание цены через {formatWaitHorizon(predict.lagMinutes)} после минуты новости
                </div>
              ) : (
                <>
                  {resultLabel(predict.result) ? (
                    <p className="mt-2 text-base text-white/90">
                      Результат:{" "}
                      <span className={resultTextClass(predict.result)}>
                        {resultLabel(predict.result)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-white/55">
                      Предсказание нейтральное — итог «успех/неуспех» не применяется.
                    </p>
                  )}

                  {predict.resultPercent !== null && predict.resultPercent !== undefined && (
                    <p className="mt-1 text-white/75">
                      Изменение цены:{" "}
                      <span className="font-medium text-white">
                        {predict.resultPercent > 0 ? "+" : ""}
                        {predict.resultPercent.toFixed(2)}%
                      </span>
                    </p>
                  )}

                  {predict.profit !== null && predict.profit !== undefined && (
                    <p className="mt-1 text-white/75">
                      Profit:{" "}
                      <span className="font-medium text-white">
                        {predict.profit > 0 ? "+" : ""}
                        {predict.profit.toFixed(2)}%
                      </span>
                    </p>
                  )}

                  {predict.priceBefore !== null &&
                    predict.priceAfter !== null &&
                    Number.isFinite(predict.priceBefore) &&
                    Number.isFinite(predict.priceAfter) && (
                      <>
                        <p className="mt-2 font-mono text-sm text-white/70">
                          Цена A — B: {predict.priceBefore.toFixed(2)} → {predict.priceAfter.toFixed(2)}
                        </p>
                        <PredictMinutePathChart
                          predictId={predict.id}
                          lagMinutes={predict.lagMinutes}
                        />
                      </>
                    )}
                </>
              )}
            </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
