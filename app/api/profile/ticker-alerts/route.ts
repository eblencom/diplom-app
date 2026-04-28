import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";
import {
  getUserTickerAlertCompanyIds,
  setUserTickerAlertCompanyIds,
} from "@/lib/user-ticker-alerts";
import {
  getUserTelegramState,
  markUserTgDigestTimersNow,
  updateUserTgNewsInterval,
} from "@/lib/user-telegram";

type Body = { companyIds?: unknown; newsIntervalMinutes?: unknown };

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return false;
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  return response.ok;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  const state = await getUserTelegramState(session.userId);
  return NextResponse.json({
    companyIds: state.alertCompanyIds,
    newsIntervalMinutes: state.newsIntervalMinutes,
  });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const raw = body.companyIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Ожидается массив companyIds." }, { status: 400 });
  }

  const companyIds = raw
    .map((x) => Math.round(Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const interval = Math.round(Number(body.newsIntervalMinutes ?? 10));
  if (!Number.isFinite(interval) || interval < 1 || interval > 1440) {
    return NextResponse.json(
      { error: "Интервал рассылки должен быть от 1 до 1440 минут." },
      { status: 400 },
    );
  }

  await setUserTickerAlertCompanyIds(session.userId, companyIds);
  const newsIntervalMinutes = await updateUserTgNewsInterval(session.userId, interval);
  const saved = await getUserTickerAlertCompanyIds(session.userId);
  const state = await getUserTelegramState(session.userId);

  let telegramNotified = false;
  if (state.tgChatId != null) {
    telegramNotified = await sendTelegramMessage(
      state.tgChatId,
      `Настройки рассылки обновлены. Интервал: ${newsIntervalMinutes} мин. Компаний выбрано: ${saved.length}. Следующая проверка начнётся после этого интервала.`,
    );
    if (telegramNotified) {
      await markUserTgDigestTimersNow(session.userId);
    }
  }

  return NextResponse.json({
    ok: true,
    companyIds: saved,
    newsIntervalMinutes,
    telegramNotified,
  });
}
