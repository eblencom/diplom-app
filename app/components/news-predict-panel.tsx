"use client";

import { useEffect, useState } from "react";

import { PredictTwoPointChart } from "@/app/components/predict-two-point-chart";
import type { UserPredictOnNews } from "@/lib/predicts-types";

type Props = {
  newsId: number;
  initialPredict: UserPredictOnNews | null;
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

export function NewsPredictPanel({ newsId, initialPredict }: Props) {
  const [predict, setPredict] = useState<UserPredictOnNews | null>(initialPredict);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPredict !== null) {
      setPredict(initialPredict);
    }
  }, [initialPredict]);

  useEffect(() => {
    if (!predict || predict.status !== "expect") {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    const startedAt = Date.now();
    const maxWaitMs = 45 * 60 * 1000;

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
          timeoutId = window.setTimeout(() => void tick(), 2000);
          return;
        }
        const payload = (await response.json()) as { predict: UserPredictOnNews | null };
        const next = payload.predict;
        if (next?.status === "closed") {
          setPredict(next);
          return;
        }
      } catch {
        // сеть / временные ошибки
      }

      timeoutId = window.setTimeout(() => void tick(), 2000);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [newsId, predict?.id, predict?.status]);

  if (!predict) {
    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const response = await fetch(`/api/news/${newsId}/predict`, {
                method: "POST",
                credentials: "include",
              });
              if (!response.ok) {
                setError("Не удалось сохранить предсказание");
                return;
              }
              const payload = (await response.json()) as { predict: UserPredictOnNews | null };
              if (payload.predict) {
                setPredict(payload.predict);
              }
            } catch {
              setError("Ошибка сети");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-full border border-violet-400/50 bg-violet-500/20 px-4 py-1.5 text-sm text-violet-100 transition hover:bg-violet-500/30 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Предсказать"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>
    );
  }

  if (predict.status === "expect") {
    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-sm text-white/85">
          Предсказание: <span className="font-medium text-white">{predictionLabel(predict.prediction)}</span>
        </p>
        <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/60">
          <span
            className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-violet-400"
            aria-hidden
          />
          Ожидание срока исполнения предсказания
        </div>
      </div>
    );
  }

  const outcomeText = resultLabel(predict.result);
  const pct =
    predict.resultPercent === null || predict.resultPercent === undefined
      ? null
      : `${predict.resultPercent > 0 ? "+" : ""}${predict.resultPercent.toFixed(2)}%`;

  const hasPrices =
    predict.priceBefore !== null &&
    predict.priceAfter !== null &&
    Number.isFinite(predict.priceBefore) &&
    Number.isFinite(predict.priceAfter);

  return (
    <div className="mt-3 border-t border-white/10 pt-3 text-sm">
      {outcomeText ? (
        <p className="text-white/90">
          Результат: <span className="font-semibold text-white">{outcomeText}</span>
        </p>
      ) : (
        <p className="text-white/55">Предсказание нейтральное — итог «успех/неуспех» не применяется.</p>
      )}

      {pct !== null && (
        <p className="mt-1 text-white/75">
          Изменение цены: <span className="font-medium text-white">{pct}</span>
        </p>
      )}

      {hasPrices && (
        <>
          <p className="mt-1 font-mono text-xs text-white/70">
            {predict.priceBefore!.toFixed(2)} — {predict.priceAfter!.toFixed(2)}
          </p>
          <PredictTwoPointChart priceBefore={predict.priceBefore!} priceAfter={predict.priceAfter!} />
        </>
      )}
    </div>
  );
}
