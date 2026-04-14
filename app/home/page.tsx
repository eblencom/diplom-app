import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#05021b] px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <AppHeader login={session.login} role={session.role} />

        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-8 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">Главная страница приложения</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Вы успешно авторизованы. Здесь будет основной контент системы
            аналитики.
          </p>
        </div>
      </section>
    </main>
  );
}
