import { NextResponse } from "next/server";
import { AuthError, deleteUserAccount } from "@/lib/auth";
import {
  clearSessionCookie,
  getCurrentSession,
} from "@/lib/session";

type DeleteBody = {
  password?: string;
};

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DeleteBody;
    await deleteUserAccount(session.userId, body.password ?? "");

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      const status =
        error.code === "INVALID_CREDENTIALS" || error.code === "USER_NOT_FOUND"
          ? 401
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Не удалось удалить аккаунт." },
      { status: 500 },
    );
  }
}
