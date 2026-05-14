import { NextResponse } from "next/server";

import { getDashboardStats } from "@/lib/dashboard-stats";
import { getCurrentSession } from "@/lib/session";

// GET ?from=&to=&userId= | userId=all tol'ko admin; otvet — JSON dlya DashboardCharts / eksporta
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const userParam = searchParams.get("userId");
  const selectedUserId =
    session.role === "admin" && userParam && userParam !== "all"
      ? Math.round(Number(userParam))
      : null;

  if (selectedUserId != null && (!Number.isFinite(selectedUserId) || selectedUserId < 1)) {
    return NextResponse.json({ error: "bad_user" }, { status: 400 });
  }

  const result = await getDashboardStats({
    userId: session.userId,
    isAdmin: session.role === "admin",
    selectedUserId,
    from,
    to,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
