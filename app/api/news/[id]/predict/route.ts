import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { runAlgosForNews } from "@/lib/run-algos";
import { getUserPredictsForNews } from "@/lib/user-predict-for-news";
import { DEFAULT_LAG_MINUTES, isPresetLagMinutes } from "@/lib/predict-lag";

// GET: prognozy polzovatelya po novosti; POST: odin gorizont, runAlgosForNews, INSERT v predicts
type NewsExists = { id: string | number };

type PredictRow = {
  id: string | number;
  news_id: string | number;
  prediction: string;
  status: string;
  result: string | null;
  result_percent: string | null;
  profit: string | null;
  lag_minutes: string | number;
};

type IdRow = { id: string | number };

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

  const predicts = await getUserPredictsForNews(session.userId, newsId);
  return NextResponse.json({ predicts });
}

export async function POST(
  request: Request,
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

  const exists = await sql<NewsExists>("SELECT id FROM news WHERE id = $1 LIMIT 1", [newsId]);
  if (!exists.rows[0]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const raw =
    typeof body === "object" && body !== null && "lagMinutes" in body
      ? (body as { lagMinutes?: unknown }).lagMinutes
      : typeof body === "object" && body !== null && "lag_minutes" in body
        ? (body as { lag_minutes?: unknown }).lag_minutes
        : DEFAULT_LAG_MINUTES;
  const lagMinutes = Math.round(Number(raw));
  if (!Number.isFinite(lagMinutes) || !isPresetLagMinutes(lagMinutes)) {
    return NextResponse.json({ error: "invalid_lag" }, { status: 400 });
  }

  const dup = await sql<IdRow>(
    `
      SELECT id
      FROM predicts
      WHERE user_id = $1 AND news_id = $2 AND lag_minutes = $3
      LIMIT 1
    `,
    [session.userId, newsId, lagMinutes],
  );
  if (dup.rows[0]) {
    return NextResponse.json({ error: "duplicate_horizon" }, { status: 409 });
  }

  let prediction: "positive" | "neutral" | "negative";
  try {
    prediction = await runAlgosForNews(newsId);
  } catch {
    return NextResponse.json({ error: "algos_failed" }, { status: 500 });
  }

  const insert = await sql<PredictRow>(
    `
      INSERT INTO predicts (user_id, news_id, prediction, lag_minutes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, news_id, prediction, status, result, result_percent, profit, lag_minutes
    `,
    [session.userId, newsId, prediction, lagMinutes],
  );

  if (!insert.rows[0]) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const predicts = await getUserPredictsForNews(session.userId, newsId);

  return NextResponse.json({ predicts });
}
