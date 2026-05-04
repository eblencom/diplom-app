import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCurrentSession } from "@/lib/session";
import { DashboardClient } from "@/app/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#05021b] px-4 py-5 text-white sm:px-6 sm:py-6">
      <section className={APP_CONTENT_MAX_CLASS}>
        <AppHeader login={session.login} role={session.role} />

        <div className="rounded-2xl border border-white/15 bg-[#0f0a35]/65 p-5 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold sm:text-5xl">Дашборд</h1>
            </div>
          </div>
          <div className="mt-6 sm:mt-8">
            <DashboardClient isAdmin={session.role === "admin"} />
          </div>
        </div>
      </section>
    </main>
  );
}
