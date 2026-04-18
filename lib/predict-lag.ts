/** Параметры горизонта для предсказания (минуты после минуты новости, MSK floor). */

export const MIN_LAG_MINUTES = 1;
export const MAX_LAG_MINUTES = 1440;
export const DEFAULT_LAG_MINUTES = 60;

export const LAG_PRESETS: readonly number[] = [1, 5, 10, 30, 60, 120, 240];

/** Запас после горизонта: синк MOEX + закрытие (сервер опрашивается чаще). */
export const PREDICT_POLL_BUFFER_MINUTES = 8;

/** Интервал опроса GET /predict в ожидании (мс). */
export const PREDICT_CLIENT_POLL_MS = 600;

export function clampLagMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_LAG_MINUTES;
  }
  return Math.min(MAX_LAG_MINUTES, Math.max(MIN_LAG_MINUTES, Math.round(value)));
}

export function isPresetLagMinutes(value: number): boolean {
  return (LAG_PRESETS as readonly number[]).includes(value);
}

export function predictPollMaxWaitMs(lagMinutes: number): number {
  const lag = clampLagMinutes(lagMinutes);
  const buffer = PREDICT_POLL_BUFFER_MINUTES;
  return (lag + buffer) * 60 * 1000;
}
