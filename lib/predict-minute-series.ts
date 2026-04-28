import "server-only";

import { fetchMoexCandles1mMap, normalizeMoexBegin } from "@/lib/moex-iss-1m";
import {
  minuteKeysFromNewsFloor,
  moexDayRangeForKeys,
} from "@/lib/msk-minute-key";

export type MinuteSeriesPoint = { begin: string; close: number | null };

export async function buildPredictMinuteSeries(
  ticker: string,
  newsDatetime: Date,
  lagMinutes: number,
  priceBefore: number | null,
  priceAfter: number | null,
): Promise<MinuteSeriesPoint[]> {
  const lag = Math.max(0, Math.round(lagMinutes));
  const keys = minuteKeysFromNewsFloor(newsDatetime, lag);
  const { from, till } = moexDayRangeForKeys(keys);
  const moex = await fetchMoexCandles1mMap(ticker, from, till);
  const byKey = new Map<string, number>();
  for (const [mb, v] of moex) {
    byKey.set(normalizeMoexBegin(mb), v);
  }

  const points: MinuteSeriesPoint[] = keys.map((begin) => {
    const k = begin.slice(0, 19);
    const close = byKey.get(k) ?? null;
    return { begin, close };
  });

  if (points.length > 0 && priceBefore != null && Number.isFinite(priceBefore)) {
    points[0] = { ...points[0], close: priceBefore };
  }
  if (points.length > 1 && priceAfter != null && Number.isFinite(priceAfter)) {
    points[points.length - 1] = {
      ...points[points.length - 1],
      close: priceAfter,
    };
  }

  return points;
}
