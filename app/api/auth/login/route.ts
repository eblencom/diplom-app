import { NextResponse } from "next/server";
import { AuthError, loginUser } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

type LoginBody = {
  login?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const login = body.login ?? "";
    const password = body.password ?? "";

    const user = await loginUser(login, password);
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
      const statusCode = error.code === "INVALID_CREDENTIALS" ? 401 : 400;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode },
      );
    }

    return NextResponse.json(
      { error: "Login failed due to server error." },
      { status: 500 },
    );
  }
}
