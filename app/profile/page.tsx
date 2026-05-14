import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCompaniesForNewsFilter } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";
import { getUserTelegramState } from "@/lib/user-telegram";
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

        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-5 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl sm:p-7 md:p-9">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Настройки профиля</h1>
          <p className="mt-3 text-base text-white/65 sm:text-lg">
            Логин, пароль, Telegram и цены для рассылки. Для смены логина и пароля нужен
            текущий пароль.
          </p>

          <div className="mt-8">
            <ProfileTelegramPreferences
              siteLogin={session.login}
              initialTgUsername={tgState.tgUsername}
              initialTgChatId={tgState.tgChatId}
              initialAlertCompanyIds={tgState.alertCompanyIds}
              initialNewsIntervalMinutes={tgState.newsIntervalMinutes}
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
