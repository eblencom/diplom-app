export function buildHomeNewsQuery(parts: {
  page: number;
  companyId?: number;
  category?: string;
  favoritesOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const p = new URLSearchParams();
  p.set("page", String(Math.max(1, parts.page)));
  if (parts.favoritesOnly) {
    p.set("favorites", "1");
  } else {
    if (parts.companyId != null && parts.companyId > 0) {
      p.set("company", String(parts.companyId));
    }
    if (parts.category && parts.category.trim() !== "") {
      p.set("category", parts.category.trim());
    }
  }
  if (parts.dateFrom && parts.dateFrom.trim() !== "") {
    p.set("from", parts.dateFrom.trim());
  }
  if (parts.dateTo && parts.dateTo.trim() !== "") {
    p.set("to", parts.dateTo.trim());
  }
  const s = p.toString();
  return s === "" ? "" : `?${s}`;
}
