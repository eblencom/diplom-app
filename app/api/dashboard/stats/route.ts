import { NextResponse } from "next/server";

import { getDashboardStats } from "@/lib/dashboard-stats";
import { getCurrentSession } from "@/lib/session";

// GET ?from=&to=&userId=&adminActivityDays= — JSON для дашборда
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

  const activityRaw = Number(searchParams.get("adminActivityDays"));
  const adminActivityWindowDays =
    session.role === "admin"
      ? Math.min(30, Math.max(1, Number.isFinite(activityRaw) ? Math.round(activityRaw) : 14))
      : undefined;

  const result = await getDashboardStats({
    userId: session.userId,
    isAdmin: session.role === "admin",
    selectedUserId,
    from,
    to,
    ...(session.role === "admin" ? { adminActivityWindowDays } : {}),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
