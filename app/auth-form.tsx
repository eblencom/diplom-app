"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

type AuthFormProps = {
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
    ? "relative isolate z-10 mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/20 p-4 shadow-lg backdrop-blur-md transition-[border-color,box-shadow] duration-500 ease-out sm:p-6"
    : "relative z-10 mx-auto w-full max-w-xl rounded-3xl border border-white/15 bg-[#0f0a35]/80 p-7 shadow-[0_20px_80px_rgba(90,24,255,0.35)] backdrop-blur-xl";

  const inputClass = `w-full min-h-11 rounded-xl border border-white/20 bg-[#151046] text-base text-white outline-none ring-violet-500/50 transition-shadow duration-300 placeholder:text-white/30 focus:ring-2 sm:min-h-0 ${isLanding ? "px-3 py-2.5 sm:text-sm" : "px-4 py-3"}`;

  return (
    <section className={`${sectionClass}${className ? ` ${className}` : ""}`}>
      {isLanding ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-950/35 via-[#0c0824]/95 to-[#08051c] transition-opacity duration-500 ease-out"
            style={{ opacity: mode === "login" ? 1 : 0 }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-950/45 via-[#12082c]/95 to-[#0a0618] transition-opacity duration-500 ease-out"
            style={{ opacity: mode === "register" ? 1 : 0 }}
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative z-10">
        <div
          className={`relative flex rounded-full border border-white/20 p-1 ${isLanding ? "mb-4 bg-black/30" : "mb-6 bg-black/25"}`}
        >
          {isLanding ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: mode === "register" ? "translateX(100%)" : "translateX(0)",
              }}
            />
          ) : null}
          <button
            type="button"
            className={`relative z-10 min-h-11 w-1/2 rounded-full px-3 py-2.5 text-sm transition sm:min-h-0 sm:px-4 sm:py-2 ${
              mode === "login"
                ? isLanding
                  ? "text-[#0d0d22]"
                  : "bg-white text-[#0d0d22]"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={`relative z-10 min-h-11 w-1/2 rounded-full px-3 py-2.5 text-sm transition sm:min-h-0 sm:px-4 sm:py-2 ${
              mode === "register"
                ? isLanding
                  ? "text-[#0d0d22]"
                  : "bg-white text-[#0d0d22]"
                : "text-white/70 hover:text-white"
            }`}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>

        <h2
          className={`font-semibold text-white ${isLanding ? "min-h-[3.25rem] text-2xl leading-tight transition-colors duration-300 sm:min-h-[2.75rem]" : "min-h-[2.5rem] text-3xl leading-tight"}`}
        >
          {title}
        </h2>
        <p
          className={`text-white/65 transition-colors duration-300 ${isLanding ? "mt-1.5 min-h-[2.75rem] text-xs leading-relaxed sm:min-h-[2.5rem]" : "mt-2 min-h-[2.75rem] text-sm leading-relaxed"}`}
        >
          Логин и пароль — латиница, цифры и символ «_».
        </p>

        <form
          onSubmit={handleSubmit}
          className={isLanding ? "mt-4 space-y-3" : "mt-6 space-y-4"}
        >
          <label className="block">
            <span className="sr-only">Логин</span>
            <input
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              aria-label="Логин"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className={inputClass}
              placeholder="login"
            />
          </label>

          <label className="block">
            <span className="sr-only">Пароль</span>
            <input
              required
              type="password"
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-label="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </label>

          {isLanding ? (
            <div className="relative min-h-[2.75rem] sm:min-h-[2.625rem]">
              <div
                className="absolute inset-0 flex items-center transition-opacity duration-300 ease-out"
                style={{
                  opacity: mode === "login" ? 1 : 0,
                  pointerEvents: mode === "login" ? "auto" : "none",
                }}
              >
                <p className="w-full rounded-xl border border-cyan-400/25 bg-cyan-500/[0.08] px-3 py-2.5 text-left text-[11px] leading-snug text-cyan-100/95 transition-[border-color,background-color] duration-300 sm:text-xs">
                  Вы тут впервые? Тогда жмите на кнопку «Регистрация»!
                </p>
              </div>
              <div
                className="absolute inset-0 transition-opacity duration-300 ease-out"
                style={{
                  opacity: mode === "register" ? 1 : 0,
                  pointerEvents: mode === "register" ? "auto" : "none",
                }}
              >
                <label className="block h-full">
                  <span className="sr-only">Повторите пароль</span>
                  <input
                    required={mode === "register"}
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    aria-label="Повторите пароль"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </label>
              </div>
            </div>
          ) : mode === "register" ? (
            <label className="block">
              <span className="sr-only">Повторите пароль</span>
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                aria-label="Повторите пароль"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </label>
          ) : null}

          <div className={isLanding ? "min-h-[2.75rem]" : "min-h-[3rem]"}>
            {error ? (
              <p className="rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm text-red-200 transition-opacity duration-200">
                {error}
              </p>
            ) : null}
          </div>

          <button
            disabled={pending}
            type="submit"
            className={`w-full min-h-11 rounded-full border border-white/50 bg-white text-base font-semibold text-[#16153d] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 ${isLanding ? "px-4 py-2.5 sm:text-sm" : "px-5 py-3 sm:text-sm"}`}
          >
            {pending ? "Подождите..." : submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
