const MSK = "Europe/Moscow";

export function floorMinuteKeyMsk(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: MSK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  const year = get("year");
  const month = get("month").padStart(2, "0");
  const day = get("day").padStart(2, "0");
  const hour = get("hour").padStart(2, "0");
  const minute = get("minute").padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

export function mskKeyToUtcDate(key: string): Date {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):00$/);
  if (!m) {
    throw new Error(`invalid MSK minute key: ${key}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  return new Date(Date.UTC(y, mo - 1, d, h - 3, mi, 0));
}

export function addMinutesToMskKey(key: string, deltaMinutes: number): string {
  const base = mskKeyToUtcDate(key);
  return floorMinuteKeyMsk(new Date(base.getTime() + deltaMinutes * 60_000));
}

export function minuteKeysFromNewsFloor(newsDatetime: Date, lagMinutes: number): string[] {
  const lag = Math.max(0, Math.round(lagMinutes));
  const start = floorMinuteKeyMsk(newsDatetime);
  const keys: string[] = [start];
  for (let i = 1; i <= lag; i++) {
    keys.push(addMinutesToMskKey(start, i));
  }
  return keys;
}

export function moexDayRangeForKeys(keys: string[]): { from: string; till: string } {
  if (keys.length === 0) {
    const t = new Date();
    const s = t.toISOString().slice(0, 10);
    return { from: s, till: s };
  }
  const first = keys[0].slice(0, 10);
  const last = keys[keys.length - 1].slice(0, 10);
  return first <= last ? { from: first, till: last } : { from: last, till: first };
}
