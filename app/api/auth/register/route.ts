import { NextResponse } from "next/server";
import { AuthError, registerUser } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

type RegisterBody = {
  login?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const login = body.login ?? "";
    const password = body.password ?? "";

    const user = await registerUser(login, password);
    const token = await createSessionToken({
      userId: user.id,
      login: user.login,
      role: user.role,
    });

    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Registration failed due to server error." },
      { status: 500 },
    );
  }
}
