import { NextResponse } from "next/server";

import { isCategorySlug } from "@/lib/company-categories";
import {
  getUserNewsFavoriteCategorySlugs,
  getUserNewsFavoriteCompanyIds,
  toggleNewsFavoriteCategory,
  toggleNewsFavoriteCompany,
} from "@/lib/news-favorites";
import { getCurrentSession } from "@/lib/session";

type Body = {
  companyId?: unknown;
  category?: unknown;
};

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  const [companyIds, categories] = await Promise.all([
    getUserNewsFavoriteCompanyIds(session.userId),
    getUserNewsFavoriteCategorySlugs(session.userId),
  ]);

  return NextResponse.json({ companyIds, categories });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }

  const hasCompany = body.companyId !== undefined && body.companyId !== null;
  const hasCategory =
    body.category !== undefined && body.category !== null && String(body.category).trim() !== "";

  if (hasCompany && hasCategory) {
    return NextResponse.json(
      { error: "Укажите только одно поле: companyId или category." },
      { status: 400 },
    );
  }
  if (!hasCompany && !hasCategory) {
    return NextResponse.json(
      { error: "Укажите companyId или category." },
      { status: 400 },
    );
  }

  try {
    if (hasCompany) {
      const companyId = Math.round(Number(body.companyId));
      if (!Number.isFinite(companyId) || companyId < 1) {
        return NextResponse.json({ error: "Некорректный companyId." }, { status: 400 });
      }
      const { favorited } = await toggleNewsFavoriteCompany(session.userId, companyId);
      return NextResponse.json({ ok: true, favorited, companyId });
    }

    const slug = String(body.category).trim();
    if (!isCategorySlug(slug)) {
      return NextResponse.json({ error: "Некорректная категория." }, { status: 400 });
    }
    const { favorited } = await toggleNewsFavoriteCategory(session.userId, slug);
    return NextResponse.json({ ok: true, favorited, category: slug });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Не удалось сохранить избранное." }, { status: 500 });
  }
}
