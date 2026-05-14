import "server-only";

import { sql } from "@/lib/db";
import type {
  DashboardBestProfitLag,
  DashboardCompanyPredictCount,
  DashboardDayPoint,
  DashboardStatsPayload,
} from "@/lib/dashboard-types";

// agregaty dashborda po intervalu dat; privyazka k date novosti (news.datetime); admin: vse polzovateli ili odin (userId)

function parseISODate(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return null;
  }
  return s;
}

function enumerateDateStringsInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const [yf, mf, df] = from.split("-").map(Number);
  const [yt, mt, dt] = to.split("-").map(Number);
  const start = Date.UTC(yf, mf - 1, df);
  const end = Date.UTC(yt, mt - 1, dt);
  for (let t = start; t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function dateToUtcMs(ymd: string): number {
  return Date.UTC(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(5, 7)) - 1,
    Number(ymd.slice(8, 10)),
  );
}

type SummaryRow = {
  win: string | null;
  lose: string | null;
  sum_result_pct: string | null;
  sum_profit: string | null;
};

type DailyPredRow = {
  d: string;
  pred_count: string | null;
  sum_result_pct: string | null;
  sum_profit: string | null;
  wins: string | null;
  losses: string | null;
};

type DailyNewsRow = {
  d: string;
  c: string | null;
};

type CompanyCountRow = {
  ticker: string;
  name: string;
  cnt: string | null;
};

type BestLagRow = {
  lag_minutes: string | null;
  sum_profit: string | null;
  cnt: string | null;
};

type ProfitExtremesRow = {
  best_positive_profit: string | null;
  worst_negative_profit: string | null;
};

type TotalPredictsRow = {
  c: string | null;
};

function num(v: string | null | undefined): number {
  if (v == null || v === "") {
    return 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getDashboardStats(input: {
  userId: number;
  isAdmin: boolean;
  selectedUserId?: number | null;
  from: string;
  to: string;
}): Promise<{ ok: true; data: DashboardStatsPayload } | { ok: false; error: string }> {
  // dalee: proverka okna dat, proverka vybrannogo id, nabor SQL, sborka days[] dlya fronta
  const from = parseISODate(input.from.trim());
  const to = parseISODate(input.to.trim());
  if (!from || !to || from > to) {
    return { ok: false, error: "bad_range" };
  }
  const spanDays = (dateToUtcMs(to) - dateToUtcMs(from)) / 86400000 + 1;
  if (spanDays > 400) {
    return { ok: false, error: "range_too_long" };
  }

  const isAdmin = input.isAdmin;
  const selectedUserId =
    isAdmin && input.selectedUserId != null && Number.isFinite(input.selectedUserId)
      ? Math.round(input.selectedUserId)
      : null;
  const includeAllUsers = isAdmin && selectedUserId == null;
  const uid = selectedUserId ?? input.userId;

  if (selectedUserId != null) {
    const userExists = await sql<{ id: string | number }>(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [selectedUserId],
    );
    if (!userExists.rows[0]) {
      return { ok: false, error: "user_not_found" };
    }
  }

  const sumRes = await sql<SummaryRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'closed' AND p.result = 'win' THEN 1 ELSE 0 END), 0)::text AS win,
      COALESCE(SUM(CASE WHEN p.status = 'closed' AND p.result = 'lose' THEN 1 ELSE 0 END), 0)::text AS lose,
      COALESCE(
        SUM(p.result_percent) FILTER (WHERE p.status = 'closed' AND p.result_percent IS NOT NULL),
        0
      )::text AS sum_result_pct,
      COALESCE(
        SUM(p.profit) FILTER (WHERE p.status = 'closed' AND p.profit IS NOT NULL),
        0
      )::text AS sum_profit
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
    `,
    [from, to, includeAllUsers, uid],
  );

  const s0 = sumRes.rows[0] ?? { win: "0", lose: "0", sum_result_pct: "0", sum_profit: "0" };
  const win = num(s0.win);
  const lose = num(s0.lose);
  const wl = win + lose;
  const weightedWinrate = wl > 0 ? win / wl : null;
  const totalResultPercentSum = num(s0.sum_result_pct);
  const totalProfitSum = num(s0.sum_profit);

  const dailyPred = await sql<DailyPredRow>(
    `
    SELECT
      (n.datetime::date)::text AS d,
      COUNT(*) FILTER (WHERE p.status = 'closed')::text AS pred_count,
      COALESCE(SUM(p.result_percent) FILTER (WHERE p.status = 'closed'), 0)::text AS sum_result_pct,
      COALESCE(SUM(p.profit) FILTER (WHERE p.status = 'closed'), 0)::text AS sum_profit,
      COALESCE(SUM(CASE WHEN p.status = 'closed' AND p.result = 'win' THEN 1 ELSE 0 END), 0)::text AS wins,
      COALESCE(SUM(CASE WHEN p.status = 'closed' AND p.result = 'lose' THEN 1 ELSE 0 END), 0)::text AS losses
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
    GROUP BY n.datetime::date
    ORDER BY d ASC
    `,
    [from, to, includeAllUsers, uid],
  );

  const predMap = new Map(dailyPred.rows.map((r) => [r.d, r]));

  const dailyNews = await sql<DailyNewsRow>(
    `
    SELECT (n.datetime::date)::text AS d, COUNT(*)::text AS c
    FROM news n
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
    GROUP BY n.datetime::date
    ORDER BY d ASC
    `,
    [from, to],
  );
  const newsMap = new Map(dailyNews.rows.map((r) => [r.d, num(r.c)]));

  const byCompany = await sql<CompanyCountRow>(
    `
    SELECT c.ticker, c.name, COUNT(*)::text AS cnt
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    INNER JOIN companies c ON c.id = n.company_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
    GROUP BY c.id, c.ticker, c.name
    ORDER BY COUNT(*) DESC, c.ticker ASC
    `,
    [from, to, includeAllUsers, uid],
  );
  const companyPredictCounts: DashboardCompanyPredictCount[] = byCompany.rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    count: num(r.cnt),
  }));

  const bestLagRes = await sql<BestLagRow>(
    `
    SELECT
      p.lag_minutes::text AS lag_minutes,
      COALESCE(SUM(p.profit), 0)::text AS sum_profit,
      COUNT(*)::text AS cnt
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
      AND p.status = 'closed'
      AND p.profit IS NOT NULL
    GROUP BY p.lag_minutes
    ORDER BY SUM(p.profit) DESC NULLS LAST, COUNT(*) DESC
    LIMIT 1
    `,
    [from, to, includeAllUsers, uid],
  );
  const bl = bestLagRes.rows[0];
  const lagM = bl?.lag_minutes != null ? Math.round(num(bl.lag_minutes)) : 0;
  const bestProfitLag: DashboardBestProfitLag | null =
    bl && lagM >= 1
      ? {
          lagMinutes: lagM,
          sumProfit: num(bl.sum_profit),
          closedCount: num(bl.cnt),
        }
      : null;

  const profitExtremesRes = await sql<ProfitExtremesRow>(
    `
    SELECT
      MAX(p.profit) FILTER (WHERE p.status = 'closed' AND p.profit > 0)::text AS best_positive_profit,
      MIN(p.profit) FILTER (WHERE p.status = 'closed' AND p.profit < 0)::text AS worst_negative_profit
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
    `,
    [from, to, includeAllUsers, uid],
  );
  const extremes = profitExtremesRes.rows[0];

  const totalPredictsRes = await sql<TotalPredictsRow>(
    `
    SELECT COUNT(*)::text AS c
    FROM predicts p
    INNER JOIN news n ON n.id = p.news_id
    WHERE n.datetime >= $1::date
      AND n.datetime < ($2::date + interval '1 day')
      AND ($3::boolean OR p.user_id = $4::bigint)
    `,
    [from, to, includeAllUsers, uid],
  );
  const totalPredictions = num(totalPredictsRes.rows[0]?.c);

  const allDays = enumerateDateStringsInclusive(from, to);
  let cumulativeResult = 0;
  let cumulativeProfit = 0;
  const days: DashboardDayPoint[] = allDays.map((date) => {
    const pr = predMap.get(date);
    const predictions = pr ? num(pr.pred_count) : 0;
    const w = pr ? num(pr.wins) : 0;
    const l = pr ? num(pr.losses) : 0;
    const wlDay = w + l;
    const winrate = wlDay > 0 ? w / wlDay : null;
    const sumResultPercent = pr ? num(pr.sum_result_pct) : 0;
    const sumProfit = pr ? num(pr.sum_profit) : 0;
    cumulativeResult += sumResultPercent;
    cumulativeProfit += sumProfit;
    return {
      date,
      winrate,
      predictions,
      newsCount: newsMap.get(date) ?? 0,
      sumResultPercent,
      sumProfit,
      cumulativeResultPercent: cumulativeResult,
      cumulativeProfit,
    };
  });
  const busiestDay = days.reduce<DashboardDayPoint | null>((best, day) => {
    if (!best || day.newsCount > best.newsCount) {
      return day;
    }
    return best;
  }, null);

  return {
    ok: true,
    data: {
      from,
      to,
      scope: includeAllUsers ? "all" : "user",
      win,
      lose,
      weightedWinrate,
      totalResultPercentSum,
      totalProfitSum,
      days,
      companyPredictCounts,
      bestProfitLag,
      visualSummary: {
        totalPredictions,
        bestPositiveProfit:
          extremes?.best_positive_profit == null ? null : num(extremes.best_positive_profit),
        worstNegativeProfit:
          extremes?.worst_negative_profit == null ? null : num(extremes.worst_negative_profit),
        busiestNewsDay:
          busiestDay && busiestDay.newsCount > 0
            ? { date: busiestDay.date, newsCount: busiestDay.newsCount }
            : null,
      },
    },
  };
}
