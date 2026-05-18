import { NextResponse } from "next/server";

import { listUsersForAdmin } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/session";
import { validateNewsDateParam } from "@/lib/news-date-param";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const registeredFrom = validateNewsDateParam(url.searchParams.get("from")?.trim());
  const registeredTo = validateNewsDateParam(url.searchParams.get("to")?.trim());

  const users = await listUsersForAdmin({
    ...(registeredFrom ? { registeredFrom } : {}),
    ...(registeredTo ? { registeredTo } : {}),
  });
  return NextResponse.json({ users });
}
