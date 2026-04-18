import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { runAlgosForNews } from "@/lib/run-algos";
import { getUserPredictSnapshotForNews } from "@/lib/user-predict-for-news";

type NewsExists = { id: string | number };

type PredictRow = {
  id: string | number;
  news_id: string | number;
  prediction: string;
  status: string;
  result: string | null;
  result_percent: string | null;
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

  const predict = await getUserPredictSnapshotForNews(session.userId, newsId);
  return NextResponse.json({ predict });
}

export async function POST(
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

  const exists = await sql<NewsExists>("SELECT id FROM news WHERE id = $1 LIMIT 1", [newsId]);
  if (!exists.rows[0]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let prediction: "positive" | "neutral" | "negative";
  try {
    prediction = await runAlgosForNews(newsId);
  } catch {
    return NextResponse.json({ error: "algos_failed" }, { status: 500 });
  }

  const insert = await sql<PredictRow>(
    `
      INSERT INTO predicts (user_id, news_id, prediction)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, news_id) DO NOTHING
      RETURNING id, news_id, prediction, status, result, result_percent
    `,
    [session.userId, newsId, prediction],
  );

  let row = insert.rows[0];
  if (!row) {
    const existing = await sql<PredictRow>(
      `
        SELECT id, news_id, prediction, status, result, result_percent
        FROM predicts
        WHERE user_id = $1 AND news_id = $2
        LIMIT 1
      `,
      [session.userId, newsId],
    );
    row = existing.rows[0];
    if (!row) {
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
  }

  const snapshot = await getUserPredictSnapshotForNews(session.userId, newsId);

  return NextResponse.json({
    predict: snapshot,
    alreadyExisted: !insert.rows[0],
  });
}
