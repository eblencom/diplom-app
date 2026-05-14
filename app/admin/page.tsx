import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { AdminUsersPanel } from "@/app/components/admin-users-panel";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCurrentSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "admin") {
    redirect("/home");
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#05021b] px-4 py-5 text-white sm:px-6 sm:py-6">
      <section className={APP_CONTENT_MAX_CLASS}>
        <AppHeader login={session.login} role={session.role} />

        <div className="rounded-2xl border border-white/15 bg-[#0f0a35]/65 p-5 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl sm:p-7">
          <h1 className="text-4xl font-semibold sm:text-5xl">Панель администратора</h1>
          <p className="mt-2 text-base text-white/60">
            Учётные записи: блокировка, разблокировка и удаление аналитиков.
          </p>
          <div className="mt-6 sm:mt-8">
            <AdminUsersPanel />
          </div>
        </div>
      </section>
    </main>
  );
}
