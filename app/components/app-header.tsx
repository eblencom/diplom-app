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
    // verkhnyaya panelka
    <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/15 bg-[#0f0a35]/75 px-4 py-4 backdrop-blur-xl sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link href="/home" className="shrink-0 text-base font-semibold text-white sm:text-lg">
        DiplomApp
      </Link>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-2">
        <div className="flex min-w-0 flex-wrap gap-2">
          <div className="min-w-0 max-w-full rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs text-white/85 sm:text-sm">
            Логин:{" "}
            <span className="font-medium break-all sm:break-normal">{login}</span>
          </div>
          <div className="shrink-0 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs text-white/85 sm:text-sm">
            Роль: <span className="font-medium">{roleLabel[role]}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/help"
            aria-label="Открыть справочную систему"
            title="Справка"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-500/10 text-base font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            ?
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10 sm:flex-initial"
          >
            Дашборд
          </Link>
          <Link
            href="/profile"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10 sm:flex-initial"
          >
            Профиль
          </Link>
          <LogoutButton className="flex-1 sm:flex-initial" />
        </div>
      </div>
    </header>
  );
}
