"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "analyst";

const roleLabel: Record<Role, string> = {
  admin: "Администратор",
  analyst: "Аналитик",
};

type ProfileActionsProps = {
  currentLogin: string;
  role: Role;
};

export function ProfileActions({ currentLogin, role }: ProfileActionsProps) {
  const router = useRouter();

  const [newLogin, setNewLogin] = useState(currentLogin);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    setLoginPending(true);

    try {
      const response = await fetch("/api/profile/login", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newLogin,
          password: loginPassword,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLoginMessage(data.error ?? "Не удалось изменить логин.");
        return;
      }

      setLoginPassword("");
      setLoginMessage("Логин успешно обновлен.");
      router.refresh();
    } catch {
      setLoginMessage("Ошибка сети. Попробуйте снова.");
    } finally {
      setLoginPending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("Новый пароль и подтверждение не совпадают.");
      return;
    }

    setPasswordPending(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPasswordMessage(data.error ?? "Не удалось изменить пароль.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordMessage("Пароль успешно изменен.");
    } catch {
      setPasswordMessage("Ошибка сети. Попробуйте снова.");
    } finally {
      setPasswordPending(false);
    }
  }

  async function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteMessage("");

    const confirmed = window.confirm(
      "Вы уверены, что хотите удалить аккаунт? Действие необратимо.",
    );

    if (!confirmed) {
      return;
    }

    setDeletePending(true);
    try {
      const response = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setDeleteMessage(data.error ?? "Не удалось удалить аккаунт.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setDeleteMessage("Ошибка сети. Попробуйте снова.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-sm text-white/60">Текущий логин</p>
          <p className="text-lg font-medium">{currentLogin}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-sm text-white/60">Роль</p>
          <p className="text-lg font-medium">{roleLabel[role]}</p>
        </div>
      </div>

      <form
        onSubmit={handleLoginSubmit}
        className="rounded-2xl border border-white/15 bg-black/20 p-5"
      >
        <h2 className="text-xl font-semibold">Изменить логин</h2>
        <p className="mt-1 text-sm text-white/65">
          Для подтверждения введите текущий пароль.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_]+"
            value={newLogin}
            onChange={(event) => setNewLogin(event.target.value)}
            placeholder="Новый логин"
            className="rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none ring-violet-500/50 placeholder:text-white/35 focus:ring-2"
          />
          <input
            required
            type="password"
            minLength={6}
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Текущий пароль"
            className="rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none ring-violet-500/50 placeholder:text-white/35 focus:ring-2"
          />
        </div>
        {loginMessage && (
          <p className="mt-3 text-sm text-white/80">{loginMessage}</p>
        )}
        <button
          disabled={loginPending}
          type="submit"
          className="mt-4 rounded-full border border-white/40 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loginPending ? "Сохранение..." : "Сохранить логин"}
        </button>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-2xl border border-white/15 bg-black/20 p-5"
      >
        <h2 className="text-xl font-semibold">Изменить пароль</h2>
        <p className="mt-1 text-sm text-white/65">
          Требуется подтверждение текущим паролем.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            required
            type="password"
            minLength={6}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Текущий пароль"
            className="rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none ring-violet-500/50 placeholder:text-white/35 focus:ring-2"
          />
          <input
            required
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Новый пароль"
            className="rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none ring-violet-500/50 placeholder:text-white/35 focus:ring-2"
          />
          <input
            required
            type="password"
            minLength={6}
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            placeholder="Подтвердите пароль"
            className="rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none ring-violet-500/50 placeholder:text-white/35 focus:ring-2"
          />
        </div>
        {passwordMessage && (
          <p className="mt-3 text-sm text-white/80">{passwordMessage}</p>
        )}
        <button
          disabled={passwordPending}
          type="submit"
          className="mt-4 rounded-full border border-white/40 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {passwordPending ? "Сохранение..." : "Сохранить пароль"}
        </button>
      </form>

      <form
        onSubmit={handleDeleteSubmit}
        className="rounded-2xl border border-red-300/35 bg-red-900/15 p-5"
      >
        <h2 className="text-xl font-semibold text-red-200">Удаление аккаунта</h2>
        <p className="mt-1 text-sm text-red-100/85">
          Аккаунт будет полностью удален из базы данных.
        </p>
        <div className="mt-4 max-w-md">
          <input
            required
            type="password"
            minLength={6}
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder="Введите пароль для подтверждения"
            className="w-full rounded-xl border border-red-200/35 bg-[#2a123f] px-4 py-3 text-white outline-none ring-red-300/60 placeholder:text-white/40 focus:ring-2"
          />
        </div>
        {deleteMessage && (
          <p className="mt-3 text-sm text-red-100">{deleteMessage}</p>
        )}
        <button
          disabled={deletePending}
          type="submit"
          className="mt-4 rounded-full border border-red-200/50 bg-red-700/70 px-4 py-2 text-sm text-white transition hover:bg-red-700/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deletePending ? "Удаление..." : "Удалить аккаунт"}
        </button>
      </form>
    </div>
  );
}
