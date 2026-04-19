import { NextResponse } from "next/server";

import { setUserBlockedByAdmin } from "@/lib/admin-users";
import { getCurrentSession } from "@/lib/session";

type Body = {
  isBlocked?: boolean;
};

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: idParam } = await ctx.params;
  const targetUserId = Number(idParam);
  if (!Number.isFinite(targetUserId) || targetUserId < 1) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.isBlocked !== "boolean") {
    return NextResponse.json({ error: "isBlocked_required" }, { status: 400 });
  }

  const result = await setUserBlockedByAdmin({
    actorUserId: session.userId,
    targetUserId,
    isBlocked: body.isBlocked,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
