/**
 * Категории для фильтра на главной. Тикер может входить в несколько
 * (например нефть + энергетика).
 */
export const CATEGORY_ORDER = [
  "energy",
  "oil",
  "gas",
  "finance",
  "metals",
  "chemistry",
  "retail",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  energy: "Энергетика",
  oil: "Нефть",
  gas: "Газ",
  finance: "Финансы",
  metals: "Металлы и добыча",
  chemistry: "Химия",
  retail: "Ритейл",
};

/** Тикер (верхний регистр) → список категорий. */
export const TICKER_CATEGORIES: Record<string, readonly CategorySlug[]> = {
  GAZP: ["energy", "gas"],
  ROSN: ["energy", "oil"],
  LKOH: ["energy", "oil"],
  SBER: ["finance"],
  VTBR: ["finance"],
  ALRS: ["metals"],
  GMKN: ["metals"],
  RUAL: ["metals"],
  NLMK: ["metals"],
  CHMF: ["metals"],
  MAGN: ["metals"],
  MTSS: ["retail"],
  PHOR: ["chemistry"],
  AKRN: ["chemistry"],
  MGNT: ["retail"],
};

export function isCategorySlug(value: string | undefined): value is CategorySlug {
  return value != null && (CATEGORY_ORDER as readonly string[]).includes(value);
}

export function tickersMatchingCategory(slug: CategorySlug): string[] {
  const out: string[] = [];
  for (const [ticker, cats] of Object.entries(TICKER_CATEGORIES)) {
    if ((cats as readonly string[]).includes(slug)) {
      out.push(ticker);
    }
  }
  return out;
}

export function categoryLabelsForTicker(ticker: string): string[] {
  const upper = ticker.trim().toUpperCase();
  const slugs = TICKER_CATEGORIES[upper];
  if (!slugs?.length) {
    return [];
  }
  return slugs.map((s) => CATEGORY_LABELS[s]);
}
