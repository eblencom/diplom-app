export function normalizeTelegramUsername(raw: string): string | null {
  let s = raw.trim();
  if (!s) {
    return null;
  }
  if (s.startsWith("@")) {
    s = s.slice(1);
  }
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(s)) {
    return null;
  }
  return s;
}
