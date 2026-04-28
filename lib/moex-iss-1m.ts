import "server-only";

export async function fetchMoexCandles1mMap(
  ticker: string,
  dayFrom: string,
  dayTill: string,
): Promise<Map<string, number>> {
  const upper = ticker.trim().toUpperCase();
  const url =
    "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/" +
    `${encodeURIComponent(upper)}/candles.json`;

  const dedup = new Map<string, number>();
  let start = 0;

  for (;;) {
    const params = new URLSearchParams({
      interval: "1",
      from: dayFrom,
      till: dayTill,
      start: String(start),
    });
    const response = await fetch(`${url}?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`MOEX candles HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      candles?: { columns?: string[]; data?: unknown[][] };
    };
    const block = payload.candles;
    if (!block?.columns?.length || !block.data?.length) {
      break;
    }
    const cols = block.columns;
    const data = block.data;
    const ci = Object.fromEntries(cols.map((name, idx) => [name, idx])) as Record<string, number>;
    const ib = ci.begin;
    const iclose = ci.close;
    if (ib === undefined || iclose === undefined) {
      break;
    }
    for (const row of data) {
      const begin = row[ib];
      const close = row[iclose];
      if (begin == null || close == null) {
        continue;
      }
      const key = String(begin).slice(0, 19);
      dedup.set(key, Number(close));
    }
    start += data.length;
    if (data.length === 0) {
      break;
    }
  }

  return dedup;
}

export function normalizeMoexBegin(s: string): string {
  return String(s).slice(0, 19);
}
