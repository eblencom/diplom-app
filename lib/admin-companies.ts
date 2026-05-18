import "server-only";

import { sql } from "@/lib/db";
import { CATEGORY_LABELS, isCategorySlug, type CategorySlug } from "@/lib/company-categories";

export type AdminCompanyListItem = {
  id: number;
  name: string;
  ticker: string;
  newsLink: string | null;
  priceLink: string | null;
  pricesPath: string | null;
  logoPath: string | null;
  categorySlugs: CategorySlug[];
};

type CompanyRow = {
  id: string | number;
  name: string;
  ticker: string;
  news_link: string | null;
  price_link: string | null;
  prices_path: string | null;
  logo_path: string | null;
  category_slugs: string[] | string | null;
};

export type CreateCompanyInput = {
  name: string;
  ticker: string;
  newsLink: string | null;
  priceLink: string | null;
  pricesPath: string | null;
  logoPath: string | null;
  categorySlugs: CategorySlug[];
};

export type CreateCompanyResult =
  | { ok: true; company: AdminCompanyListItem }
  | { ok: false; status: 400 | 409; message: string };

type PgErrorLike = {
  code?: string;
  constraint?: string;
};

function normalizeId(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function parseCategorySlugs(value: string[] | string | null): CategorySlug[] {
  const raw =
    Array.isArray(value) ? value : typeof value === "string" ? value.replace(/[{}"]/g, "").split(",") : [];
  return raw.filter((slug): slug is CategorySlug => isCategorySlug(slug));
}

function mapCompanyRow(row: CompanyRow): AdminCompanyListItem {
  return {
    id: normalizeId(row.id),
    name: row.name,
    ticker: row.ticker,
    newsLink: row.news_link,
    priceLink: row.price_link,
    pricesPath: row.prices_path,
    logoPath: row.logo_path,
    categorySlugs: parseCategorySlugs(row.category_slugs),
  };
}

export function sanitizeCompanyTicker(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "");
}

export function normalizeOptionalText(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCompanyCategories(input: FormDataEntryValue[]): CategorySlug[] {
  const unique = new Set<CategorySlug>();
  for (const value of input) {
    if (typeof value === "string" && isCategorySlug(value)) {
      unique.add(value);
    }
  }
  return [...unique];
}

export async function listCompaniesForAdmin(): Promise<AdminCompanyListItem[]> {
  const result = await sql<CompanyRow>(
    `
    SELECT id, name, ticker, news_link, price_link, prices_path, logo_path, category_slugs
    FROM companies
    ORDER BY name ASC, ticker ASC
    `,
  );
  return result.rows.map(mapCompanyRow);
}

export async function findCompanyByTicker(tickerInput: string): Promise<AdminCompanyListItem | null> {
  const ticker = sanitizeCompanyTicker(tickerInput);
  if (!ticker) {
    return null;
  }
  const result = await sql<CompanyRow>(
    `
    SELECT id, name, ticker, news_link, price_link, prices_path, logo_path, category_slugs
    FROM companies
    WHERE ticker = $1
    LIMIT 1
    `,
    [ticker],
  );
  const row = result.rows[0];
  return row ? mapCompanyRow(row) : null;
}

async function resetCompaniesIdSequence(): Promise<void> {
  await sql(
    `
    SELECT setval(
      pg_get_serial_sequence('companies', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM companies), 0), 1),
      true
    )
    `,
  );
}

function isPgUniqueError(e: unknown): e is PgErrorLike {
  return typeof e === "object" && e != null && "code" in e && (e as PgErrorLike).code === "23505";
}

async function insertCompany(input: CreateCompanyInput & { name: string; ticker: string }) {
  return sql<CompanyRow>(
    `
    INSERT INTO companies (
      name,
      ticker,
      news_link,
      price_link,
      prices_path,
      logo_path,
      category_slugs
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::text[])
    RETURNING id, name, ticker, news_link, price_link, prices_path, logo_path, category_slugs
    `,
    [
      input.name,
      input.ticker,
      input.newsLink,
      input.priceLink,
      input.pricesPath,
      input.logoPath,
      input.categorySlugs,
    ],
  );
}

export async function createCompany(input: CreateCompanyInput): Promise<CreateCompanyResult> {
  const name = input.name.trim();
  const ticker = sanitizeCompanyTicker(input.ticker);
  if (name.length < 2 || name.length > 255) {
    return { ok: false, status: 400, message: "Название должно быть от 2 до 255 символов." };
  }
  if (ticker.length < 2 || ticker.length > 32) {
    return { ok: false, status: 400, message: "Код цены должен быть от 2 до 32 символов." };
  }

  try {
    let result;
    try {
      result = await insertCompany({ ...input, name, ticker });
    } catch (e) {
      if (isPgUniqueError(e) && e.constraint === "companies_pkey") {
        await resetCompaniesIdSequence();
        result = await insertCompany({ ...input, name, ticker });
      } else {
        throw e;
      }
    }
    const row = result.rows[0];
    if (!row) {
      return { ok: false, status: 400, message: "Не удалось создать компанию." };
    }
    return { ok: true, company: mapCompanyRow(row) };
  } catch (e) {
    if (isPgUniqueError(e) && e.constraint === "companies_ticker_key") {
      return { ok: false, status: 409, message: "Компания с таким кодом цены уже существует." };
    }
    if (isPgUniqueError(e)) {
      return { ok: false, status: 409, message: "Не удалось создать компанию из-за конфликта уникальности в БД." };
    }
    throw e;
  }
}

export function companyCategoryLabel(slug: CategorySlug): string {
  return CATEGORY_LABELS[slug];
}
