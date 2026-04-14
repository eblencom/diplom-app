import { NextResponse } from "next/server";
import { changeUserLogin, AuthError } from "@/lib/auth";
import {
  createSessionToken,
  getCurrentSession,
  setSessionCookie,
} from "@/lib/session";

type ChangeLoginBody = {
  newLogin?: string;
  password?: string;
};

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ChangeLoginBody;
    const user = await changeUserLogin(
      session.userId,
      body.newLogin ?? "",
      body.password ?? "",
    );

    const token = await createSessionToken({
      userId: user.id,
      login: user.login,
      role: user.role,
    });

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
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
      { error: "Не удалось изменить логин." },
      { status: 500 },
    );
  }
}
