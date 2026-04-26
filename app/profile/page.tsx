import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCompaniesForNewsFilter } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";
import { getUserTelegramState } from "@/lib/user-telegram";
import { BackNavButton } from "@/app/components/back-nav-button";
import { ProfileActions } from "@/app/profile/profile-actions";
import { ProfileTelegramPreferences } from "@/app/profile/profile-telegram-preferences";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const [tgState, companies] = await Promise.all([
    getUserTelegramState(session.userId),
    getCompaniesForNewsFilter(),
  ]);

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#05021b] px-4 py-6 text-white sm:px-6 sm:py-8">
      <section className={APP_CONTENT_MAX_CLASS}>
        <AppHeader login={session.login} role={session.role} />

        <div className="mb-4 sm:mb-6">
          <BackNavButton />
        </div>

        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-4 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl sm:p-6 md:p-8">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Настройки профиля</h1>
          <p className="mt-2 text-sm text-white/65 sm:text-base">
            Логин, пароль, Telegram и тикеры для рассылки. Для смены логина и пароля нужен
            текущий пароль.
          </p>

          <div className="mt-8">
            <ProfileTelegramPreferences
              siteLogin={session.login}
              initialTgUsername={tgState.tgUsername}
              initialTgChatId={tgState.tgChatId}
              initialAlertCompanyIds={tgState.alertCompanyIds}
              companies={companies}
            />
          </div>

          <div className="mt-10">
            <ProfileActions currentLogin={session.login} role={session.role} />
          </div>
        </div>
      </section>
    </main>
  );
}
