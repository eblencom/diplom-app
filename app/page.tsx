import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth-form";
import { getCurrentSession } from "@/lib/session";

export default async function Home() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05021b] px-4 py-6 text-white md:py-8">
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[320px] w-[600px] -translate-x-1/2 rounded-full bg-fuchsia-500/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-220px] left-[-100px] h-[400px] w-[400px] rounded-full bg-violet-700/45 blur-3xl" />
      <div className="pointer-events-none absolute right-[-100px] top-[30%] h-[350px] w-[350px] rounded-full bg-indigo-600/40 blur-3xl" />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <section className="mb-6 text-center">
          <p className="mx-auto mb-6 inline-flex rounded-full border border-white/25 bg-white/5 px-4 py-1 text-sm text-white/75">
            Вход по логину и паролю
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Безопасный доступ к аналитической платформе
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/65">
            Войдите или зарегистрируйтесь. Пароли хешируются, роли
            пользователей хранятся в PostgreSQL.
          </p>
        </section>

        <AuthForm />
      </div>
    </main>
  );
}
