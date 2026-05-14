/** Best-effort client IP from reverse-proxy / CDN headers (Vercel, nginx, Cloudflare). */
export function pickClientIp(headerGet: (name: string) => string | null): string {
  const xff = headerGet("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  for (const name of ["x-real-ip", "cf-connecting-ip", "true-client-ip"] as const) {
    const v = headerGet(name)?.trim();
    if (v) {
      return v;
    }
  }
  return "—";
}

/** IP для записи в БД: `null`, если адрес неизвестен или плейсхолдер «—». */
export function normalizeRegistrationIp(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const t = raw.trim();
  if (t === "" || t === "—") {
    return null;
  }
  return t.slice(0, 64);
}

export function pickClientIpFromRequest(request: Request): string {
  return pickClientIp((name) => request.headers.get(name));
}
