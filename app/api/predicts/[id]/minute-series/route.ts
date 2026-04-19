import { NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { buildPredictMinuteSeries } from "@/lib/predict-minute-series";
import { getCurrentSession } from "@/lib/session";

type Row = {
  id: string | number;
  lag_minutes: string | number;
  status: string;
  price_before: string | number | null;
  price_after: string | number | null;
  news_datetime: Date;
  ticker: string;
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
  const predictId = Number(id);
  if (!Number.isFinite(predictId) || predictId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const result = await sql<Row>(
    `
      SELECT p.id,
             p.lag_minutes,
             p.status,
             p.price_before,
             p.price_after,
             n.datetime AS news_datetime,
             c.ticker AS ticker
      FROM predicts p
      INNER JOIN news n ON n.id = p.news_id
      INNER JOIN companies c ON c.id = n.company_id
      WHERE p.id = $1 AND p.user_id = $2
      LIMIT 1
    `,
    [predictId, session.userId],
  );

  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (row.status !== "closed") {
    return NextResponse.json({ error: "predict_not_closed" }, { status: 409 });
  }

  const lagMinutes = Math.round(Number(row.lag_minutes));
  const priceBefore =
    row.price_before === null || row.price_before === undefined
      ? null
      : Number(row.price_before);
  const priceAfter =
    row.price_after === null || row.price_after === undefined
      ? null
      : Number(row.price_after);

  if (
    priceBefore === null ||
    priceAfter === null ||
    !Number.isFinite(priceBefore) ||
    !Number.isFinite(priceAfter)
  ) {
    return NextResponse.json({ error: "missing_prices" }, { status: 409 });
  }

  try {
    const points = await buildPredictMinuteSeries(
      String(row.ticker),
      new Date(row.news_datetime),
      lagMinutes,
      priceBefore,
      priceAfter,
    );
    return NextResponse.json({ points, lagMinutes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "moex_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
