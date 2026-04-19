import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";
import { normalizeTelegramUsername } from "@/lib/telegram-username";
import { updateUserTgUsername } from "@/lib/user-telegram";

type Body = { tgUsername?: string };

export async function PATCH(request: Request) {
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

  const raw = typeof body.tgUsername === "string" ? body.tgUsername : "";
  if (raw.trim() === "") {
    await updateUserTgUsername(session.userId, "");
    return NextResponse.json({ ok: true, tgUsername: "" });
  }

  const normalized = normalizeTelegramUsername(raw);
  if (!normalized) {
    return NextResponse.json(
      {
        error:
          "Некорректный username: 5–32 символа, латиница, цифры и _, без @ в начале (можно вставить как в Telegram).",
      },
      { status: 400 },
    );
  }

  await updateUserTgUsername(session.userId, normalized);
  return NextResponse.json({ ok: true, tgUsername: normalized });
}
