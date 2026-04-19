import { NextResponse } from "next/server";

import { listUsersForAdmin } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await listUsersForAdmin();
  return NextResponse.json({ users });
}
