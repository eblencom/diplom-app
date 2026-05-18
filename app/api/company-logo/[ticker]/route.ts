import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { sanitizeCompanyTicker } from "@/lib/admin-companies";
import { sql } from "@/lib/db";
import { getProjectRoot } from "@/lib/project-root";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ ticker: string }>;
};

type CompanyLogoRow = {
  ticker: string;
  name: string;
  logo_path: string | null;
};

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function svgFallback(ticker: string, name: string): string {
  const safeName = name.replace(/[<>&"]/g, "");
  const label = (ticker || safeName || "?").slice(0, 4).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${safeName}">
  <rect width="96" height="96" rx="48" fill="#ffffff"/>
  <rect x="4" y="4" width="88" height="88" rx="44" fill="#0f172a"/>
  <text x="48" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#67e8f9">${label}</text>
</svg>`;
}

function svgResponse(ticker: string, name: string): NextResponse {
  return new NextResponse(svgFallback(ticker, name), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}

async function fileResponse(filePath: string): Promise<NextResponse | null> {
  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { ticker: rawTicker } = await context.params;
  const safeTicker = sanitizeCompanyTicker(decodeURIComponent(rawTicker ?? ""));

  if (!safeTicker) {
    return svgResponse("?", "Компания");
  }

  const result = await sql<CompanyLogoRow>(
    `
    SELECT ticker, name, logo_path
    FROM companies
    WHERE ticker = $1
    LIMIT 1
    `,
    [safeTicker],
  );
  const company = result.rows[0];

  if (company?.logo_path) {
    const publicRoot = path.join(getProjectRoot(), "public");
    const filePath = path.normalize(path.join(publicRoot, company.logo_path.replace(/^\//, "")));
    if (filePath.startsWith(publicRoot)) {
      const response = await fileResponse(filePath);
      if (response) {
        return response;
      }
    }
  }

  const legacyPath = path.join(getProjectRoot(), "imgs", "logos", `${safeTicker}.png`);
  const legacyResponse = await fileResponse(legacyPath);
  if (legacyResponse) {
    return legacyResponse;
  }

  return svgResponse(safeTicker, company?.name ?? safeTicker);
}
