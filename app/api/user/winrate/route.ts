import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";
import { getUserWinrateStats } from "@/lib/user-winrate";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await getUserWinrateStats(session.userId);
  return NextResponse.json(stats);
}
