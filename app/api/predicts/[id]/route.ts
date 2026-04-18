import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const predictId = Number(id);
  if (!Number.isFinite(predictId) || predictId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const deleted = await sql(
    `
      DELETE FROM predicts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [predictId, session.userId],
  );

  if ((deleted.rowCount ?? 0) === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
