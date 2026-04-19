import { NextResponse } from "next/server";

import { buildTickerTapeItems, getTickerTapeRows } from "@/lib/ticker-tape-prices";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await getTickerTapeRows();
  if (rows.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items = await buildTickerTapeItems(rows, 4);
  return NextResponse.json({ items });
}
