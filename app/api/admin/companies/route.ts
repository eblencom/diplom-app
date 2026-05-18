import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import {
  createCompany,
  findCompanyByTicker,
  listCompaniesForAdmin,
  normalizeOptionalText,
  parseCompanyCategories,
  sanitizeCompanyTicker,
} from "@/lib/admin-companies";
import { getProjectRoot } from "@/lib/project-root";
import { getCurrentSession } from "@/lib/session";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function error(message: string, status: 400 | 403 | 409 | 500 = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function saveCompanyLogo(ticker: string, logo: File | null): Promise<string | null> {
  if (!logo || logo.size === 0) {
    return null;
  }
  if (logo.size > MAX_LOGO_BYTES) {
    throw new Error("logo_too_large");
  }
  const ext = LOGO_TYPES[logo.type];
  if (!ext) {
    throw new Error("bad_logo_type");
  }

  const dir = path.join(process.cwd(), "public", "company-logos");
  await mkdir(dir, { recursive: true });
  const fileName = `${ticker}.${ext}`;
  const fsPath = path.join(dir, fileName);
  const bytes = new Uint8Array(await logo.arrayBuffer());
  await writeFile(fsPath, bytes);
  return `/company-logos/${fileName}`;
}

async function ensureCompanyPricesFile(ticker: string): Promise<string> {
  const fileName = `${ticker.toLowerCase()}.json`;
  const relativePath = `prices/${fileName}`;
  const dir = path.join(getProjectRoot(), "prices");
  const fsPath = path.join(dir, fileName);

  await mkdir(dir, { recursive: true });
  await writeFile(fsPath, `${JSON.stringify({ version: 1, items: [] }, null, 2)}\n`, {
    flag: "wx",
  }).catch((e: unknown) => {
    if (typeof e === "object" && e != null && "code" in e && e.code === "EEXIST") {
      return;
    }
    throw e;
  });

  return relativePath;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return error("forbidden", 403);
  }

  const companies = await listCompaniesForAdmin();
  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return error("forbidden", 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Некорректные данные формы.");
  }

  const name = normalizeOptionalText(form.get("name")) ?? "";
  const ticker = sanitizeCompanyTicker(normalizeOptionalText(form.get("ticker")) ?? "");
  const logo = form.get("logo");
  let logoPath: string | null = null;
  if (name.trim().length < 2 || name.trim().length > 255) {
    return error("Название должно быть от 2 до 255 символов.");
  }
  if (ticker.length < 2 || ticker.length > 32) {
    return error("Код цены должен быть от 2 до 32 символов.");
  }

  const existing = await findCompanyByTicker(ticker);
  if (existing) {
    return error(`Компания с кодом цены ${ticker} уже есть в базе: «${existing.name}».`, 409);
  }

  try {
    logoPath = await saveCompanyLogo(ticker, logo instanceof File ? logo : null);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "logo_too_large") {
      return error("Логотип должен быть не больше 2 МБ.");
    }
    if (code === "bad_logo_type") {
      return error("Логотип должен быть PNG, JPG, WebP или SVG.");
    }
    throw e;
  }

  const pricesPath = `prices/${ticker.toLowerCase()}.json`;
  const result = await createCompany({
    name,
    ticker,
    newsLink: normalizeOptionalText(form.get("newsLink")),
    priceLink: normalizeOptionalText(form.get("priceLink")),
    pricesPath,
    logoPath,
    categorySlugs: parseCompanyCategories(form.getAll("categorySlugs")),
  });

  if (!result.ok) {
    if (logoPath) {
      await unlink(path.join(process.cwd(), "public", logoPath.replace(/^\//, ""))).catch(() => {});
    }
    return error(result.message, result.status);
  }

  await ensureCompanyPricesFile(ticker);

  return NextResponse.json({ company: result.company }, { status: 201 });
}
