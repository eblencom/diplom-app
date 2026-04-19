"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

type AuthFormProps = {
  /** landing — компактная карточка в сетке лендинга */
  variant?: "default" | "landing";
  className?: string;
};

export function AuthForm({ variant = "default", className }: AuthFormProps = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "С возвращением" : "Создайте аккаунт"),
    [mode],
  );

  const submitLabel = mode === "login" ? "Войти" : "Зарегистрироваться";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setPending(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Ошибка авторизации.");
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setPending(false);
    }
  }

  const isLanding = variant === "landing";

  const sectionClass = isLanding
    ? "relative z-10 mx-auto w-full max-w-md rounded-2xl border border-white/20 bg-[#0c0824]/90 p-5 shadow-lg backdrop-blur-xl sm:p-6 lg:mx-0 lg:max-w-none"
    : "relative z-10 mx-auto w-full max-w-xl rounded-3xl border border-white/15 bg-[#0f0a35]/80 p-7 shadow-[0_20px_80px_rgba(90,24,255,0.35)] backdrop-blur-xl";

  return (
    <section className={`${sectionClass}${className ? ` ${className}` : ""}`}>
      <div className={`flex rounded-full border border-white/20 bg-black/25 p-1 ${isLanding ? "mb-4" : "mb-6"}`}>
        <button
          type="button"
          className={`w-1/2 rounded-full px-4 py-2 text-sm transition ${
            mode === "login"
              ? "bg-white text-[#0d0d22]"
              : "text-white/70 hover:text-white"
          }`}
          onClick={() => setMode("login")}
        >
          Вход
        </button>
        <button
          type="button"
          className={`w-1/2 rounded-full px-4 py-2 text-sm transition ${
            mode === "register"
              ? "bg-white text-[#0d0d22]"
              : "text-white/70 hover:text-white"
          }`}
          onClick={() => setMode("register")}
        >
          Регистрация
        </button>
      </div>

      <h2 className={`font-semibold text-white ${isLanding ? "text-2xl" : "text-3xl"}`}>{title}</h2>
      <p className={`text-white/65 ${isLanding ? "mt-1.5 text-xs" : "mt-2 text-sm"}`}>
        Логин и пароль — латиница, цифры и символ «_».
      </p>

      <form onSubmit={handleSubmit} className={isLanding ? "mt-4 space-y-3" : "mt-6 space-y-4"}>
        <label className="block">
          <span className="mb-1 block text-sm text-white/75">Логин</span>
          <input
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_]+"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            className={`w-full rounded-xl border border-white/20 bg-[#151046] text-white outline-none ring-violet-500/50 placeholder:text-white/30 focus:ring-2 ${isLanding ? "px-3 py-2.5 text-sm" : "px-4 py-3"}`}
            placeholder="ваш_логин"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-white/75">Пароль</span>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`w-full rounded-xl border border-white/20 bg-[#151046] text-white outline-none ring-violet-500/50 placeholder:text-white/30 focus:ring-2 ${isLanding ? "px-3 py-2.5 text-sm" : "px-4 py-3"}`}
            placeholder="********"
          />
        </label>

        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-sm text-white/75">
              Повторите пароль
            </span>
            <input
              required
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`w-full rounded-xl border border-white/20 bg-[#151046] text-white outline-none ring-violet-500/50 placeholder:text-white/30 focus:ring-2 ${isLanding ? "px-3 py-2.5 text-sm" : "px-4 py-3"}`}
              placeholder="********"
            />
          </label>
        )}

        {error && (
          <p className="rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          disabled={pending}
          type="submit"
          className={`w-full rounded-full border border-white/50 bg-white font-semibold text-[#16153d] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${isLanding ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"}`}
        >
          {pending ? "Подождите..." : submitLabel}
        </button>
      </form>
    </section>
  );
}
