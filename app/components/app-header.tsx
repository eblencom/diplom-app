import Link from "next/link";
import type { UserRole } from "@/lib/session";
import { LogoutButton } from "@/app/components/logout-button";

const roleLabel: Record<UserRole, string> = {
  admin: "Администратор",
  analyst: "Аналитик",
};

type AppHeaderProps = {
  login: string;
  role: UserRole;
};

export function AppHeader({ login, role }: AppHeaderProps) {
  return (
    // shapka: brend, navigaciya, rol', vyhod
    <header className="mb-6 grid gap-4 rounded-2xl border border-white/15 bg-[#0f0a35]/75 px-4 py-4 backdrop-blur-xl sm:mb-8 sm:px-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <Link href="/home" className="shrink-0 text-xl font-semibold text-white sm:text-2xl">
          DiplomApp
        </Link>
        {role === "admin" ? (
          <Link
            href="/admin"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-500/25 sm:px-4 sm:py-2 sm:text-sm"
          >
            Панель администратора
          </Link>
        ) : null}
      </div>

      <nav
        aria-label="Основное меню"
        className="min-w-0 overflow-x-auto rounded-full border border-white/15 bg-black/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <div className="grid min-w-max grid-cols-4 gap-1">
          {[
            ["Главная", "/home"],
            ["Дашборд", "/dashboard"],
            ["Профиль", "/profile"],
            ["Справка", "/help"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-base font-medium text-white/82 transition hover:bg-white/10 hover:text-white sm:min-w-28"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 xl:flex-nowrap">
        <div className="min-w-0 max-w-full rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm text-white/85 sm:text-base">
          Логин: <span className="font-medium break-all sm:break-normal">{login}</span>
        </div>
        <div className="shrink-0 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm text-white/85 sm:text-base">
          Роль: <span className="font-medium">{roleLabel[role]}</span>
        </div>
        <LogoutButton className="w-full sm:w-auto" />
      </div>
    </header>
  );
}
