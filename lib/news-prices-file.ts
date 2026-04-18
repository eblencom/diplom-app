import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { getProjectRoot } from "@/lib/project-root";

export type NewsPriceEntry = {
  news_id: number;
  news_datetime: string;
  price_before: number | null;
  price_after: number | null;
};

type PricesDoc = {
  version?: number;
  items?: NewsPriceEntry[];
};

function resolveFilePath(projectRelativeOrAbsolute: string, cwd: string) {
  const raw = projectRelativeOrAbsolute.trim();
  if (!raw) {
    return null;
  }

  if (path.isAbsolute(raw)) {
    return path.resolve(raw);
  }

  return path.resolve(cwd, raw);
}

export async function readPriceBeforeFromFile(
  pricesPath: string | null,
  newsId: number,
  cwd = getProjectRoot(),
): Promise<number | null> {
  if (!pricesPath?.trim()) {
    return null;
  }

  const filePath = resolveFilePath(pricesPath, cwd);
  if (!filePath) {
    return null;
  }

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let doc: PricesDoc;
  try {
    doc = JSON.parse(trimmed) as PricesDoc;
  } catch {
    return null;
  }

  const items = doc.items ?? [];
  const match = items.find((row) => Number(row.news_id) === newsId);
  if (!match || match.price_before === null || match.price_before === undefined) {
    return null;
  }

  return typeof match.price_before === "number" ? match.price_before : Number(match.price_before);
}
