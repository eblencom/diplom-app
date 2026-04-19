import "server-only";

import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import type { UserRole } from "@/lib/session";

type DbUser = {
  id: number | string;
  login: string;
  password: string;
  role: string;
  is_blocked: boolean | null;
};

export type SafeUser = {
  id: number;
  login: string;
  role: UserRole;
};

export class AuthError extends Error {
  code:
    | "INVALID_INPUT"
    | "USER_EXISTS"
    | "INVALID_CREDENTIALS"
    | "USER_NOT_FOUND"
    | "ACCESS_DISABLED";

  constructor(
    code:
      | "INVALID_INPUT"
      | "USER_EXISTS"
      | "INVALID_CREDENTIALS"
      | "USER_NOT_FOUND"
      | "ACCESS_DISABLED",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function normalizeLogin(login: string) {
  return login.trim();
}

function assertLogin(login: string) {
  const cleanLogin = normalizeLogin(login);

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(cleanLogin)) {
    throw new AuthError(
      "INVALID_INPUT",
      "Логин должен быть длиной 3-32 символа и содержать только буквы, цифры или _.",
    );
  }

  return cleanLogin;
}

function assertPassword(password: string) {
  if (password.length < 6) {
    throw new AuthError(
      "INVALID_INPUT",
      "Пароль должен содержать минимум 6 символов.",
    );
  }
}

function assertCredentials(login: string, password: string) {
  const cleanLogin = assertLogin(login);
  assertPassword(password);
  return cleanLogin;
}

function mapRole(role: string): UserRole {
  return role === "admin" ? "admin" : "analyst";
}

type NewUserRow = {
  id: number | string;
  login: string;
  role: string;
};

function normalizeUserId(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid user id returned from database.");
  }

  return parsed;
}

export async function registerUser(login: string, password: string) {
  const cleanLogin = assertCredentials(login, password);
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await sql<NewUserRow>(
      `
        INSERT INTO users (login, password, role, tg_username)
        VALUES ($1, $2, 'analyst', '')
        RETURNING id, login, role
      `,
      [cleanLogin, passwordHash],
    );

    const createdUser = result.rows[0];

    if (!createdUser) {
      throw new Error("Failed to create user.");
    }

    return {
      id: normalizeUserId(createdUser.id),
      login: createdUser.login,
      role: mapRole(createdUser.role),
    } satisfies SafeUser;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AuthError("USER_EXISTS", "Этот логин уже занят.");
    }

    throw error;
  }
}

export async function loginUser(login: string, password: string) {
  const cleanLogin = assertCredentials(login, password);

    const result = await sql<DbUser>(
      `
      SELECT id, login, password, role, is_blocked
      FROM users
      WHERE login = $1
      LIMIT 1
    `,
      [cleanLogin],
    );

    const user = result.rows[0];
    if (!user) {
      throw new AuthError("INVALID_CREDENTIALS", "Неверный логин или пароль.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthError("INVALID_CREDENTIALS", "Неверный логин или пароль.");
    }

    if (user.is_blocked === true) {
      throw new AuthError("ACCESS_DISABLED", "Доступ к аккаунту заблокирован. Обратитесь к администратору.");
    }

  return {
    id: normalizeUserId(user.id),
    login: user.login,
    role: mapRole(user.role),
  } satisfies SafeUser;
}

type DbUserPassword = {
  id: number | string;
  login: string;
  password: string;
  role: string;
};

async function getUserById(userId: number) {
  const result = await sql<DbUserPassword>(
    `
      SELECT id, login, password, role
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "Пользователь не найден.");
  }

  return {
    id: normalizeUserId(user.id),
    login: user.login,
    password: user.password,
    role: mapRole(user.role),
  };
}

async function ensurePasswordConfirmed(userId: number, password: string) {
  assertPassword(password);
  const user = await getUserById(userId);
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new AuthError("INVALID_CREDENTIALS", "Неверный пароль подтверждения.");
  }

  return user;
}

export async function changeUserLogin(
  userId: number,
  newLogin: string,
  confirmationPassword: string,
) {
  const cleanLogin = assertLogin(newLogin);
  const user = await ensurePasswordConfirmed(userId, confirmationPassword);

  if (cleanLogin === user.login) {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
    } satisfies SafeUser;
  }

  try {
    const result = await sql<NewUserRow>(
      `
        UPDATE users
        SET login = $1
        WHERE id = $2
        RETURNING id, login, role
      `,
      [cleanLogin, user.id],
    );

    const updatedUser = result.rows[0];
    if (!updatedUser) {
      throw new AuthError("USER_NOT_FOUND", "Пользователь не найден.");
    }

    return {
      id: normalizeUserId(updatedUser.id),
      login: updatedUser.login,
      role: mapRole(updatedUser.role),
    } satisfies SafeUser;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AuthError("USER_EXISTS", "Этот логин уже занят.");
    }

    throw error;
  }
}

export async function changeUserPassword(
  userId: number,
  confirmationPassword: string,
  newPassword: string,
) {
  assertPassword(newPassword);
  const user = await ensurePasswordConfirmed(userId, confirmationPassword);

  if (newPassword === confirmationPassword) {
    throw new AuthError(
      "INVALID_INPUT",
      "Новый пароль должен отличаться от текущего.",
    );
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  await sql(
    `
      UPDATE users
      SET password = $1
      WHERE id = $2
    `,
    [newPasswordHash, user.id],
  );
}

export async function deleteUserAccount(
  userId: number,
  confirmationPassword: string,
) {
  const user = await ensurePasswordConfirmed(userId, confirmationPassword);
  await sql(
    `
      DELETE FROM users
      WHERE id = $1
    `,
    [user.id],
  );
}
