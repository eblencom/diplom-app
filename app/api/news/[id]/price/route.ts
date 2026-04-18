import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readPriceBeforeFromFile } from "@/lib/news-prices-file";
import { getCurrentSession } from "@/lib/session";

type Row = {
  prices_path: string | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const newsId = Number(id);
  if (!Number.isFinite(newsId) || newsId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const result = await sql<Row>(
    `
      SELECT c.prices_path
      FROM news n
      INNER JOIN companies c ON c.id = n.company_id
      WHERE n.id = $1
      LIMIT 1
    `,
    [newsId],
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const priceBefore = await readPriceBeforeFromFile(row.prices_path, newsId);

  return NextResponse.json({
    newsId,
    price_before: priceBefore,
  });
}
