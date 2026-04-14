import { NextResponse } from "next/server";
import { AuthError, changeUserPassword } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ChangePasswordBody;
    await changeUserPassword(
      session.userId,
      body.currentPassword ?? "",
      body.newPassword ?? "",
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      const status =
        error.code === "INVALID_CREDENTIALS" || error.code === "USER_NOT_FOUND"
          ? 401
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Не удалось изменить пароль." },
      { status: 500 },
    );
  }
}
