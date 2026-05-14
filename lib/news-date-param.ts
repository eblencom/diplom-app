/** Accepts only strict `YYYY-MM-DD` that is a real calendar date (UTC parts). */
export function validateNewsDateParam(raw: string | undefined | null): string | undefined {
  if (raw == null || typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return undefined;
  }
  const parts = t.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return undefined;
  }
  return t;
}

/** Keeps up to 8 digits and inserts `/` as дд/мм/гггг while typing or pasting. */
export function formatDdMmYyyyTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** `YYYY-MM-DD` → `дд/мм/гггг` for display; invalid/empty → `""`. */
export function isoDateToDdMmYyyy(iso: string | undefined | null): string {
  const v = validateNewsDateParam(iso);
  if (!v) {
    return "";
  }
  const [y, mo, d] = v.split("-");
  return `${d}/${mo}/${y}`;
}

/** Strict `дд/мм/гггг` → `YYYY-MM-DD`; invalid → `undefined`. */
export function parseDdMmYyyyToIso(raw: string): string | undefined {
  const t = raw.trim();
  if (t === "") {
    return undefined;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (!m) {
    return undefined;
  }
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
