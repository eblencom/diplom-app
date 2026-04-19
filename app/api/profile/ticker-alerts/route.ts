import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";
import {
  getUserTickerAlertCompanyIds,
  setUserTickerAlertCompanyIds,
} from "@/lib/user-ticker-alerts";

type Body = { companyIds?: unknown };

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  const companyIds = await getUserTickerAlertCompanyIds(session.userId);
  return NextResponse.json({ companyIds });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const raw = body.companyIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Ожидается массив companyIds." }, { status: 400 });
  }

  const companyIds = raw
    .map((x) => Math.round(Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0);

  await setUserTickerAlertCompanyIds(session.userId, companyIds);
  const saved = await getUserTickerAlertCompanyIds(session.userId);
  return NextResponse.json({ ok: true, companyIds: saved });
}
