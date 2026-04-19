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
    <header className="mb-8 flex items-center justify-between rounded-2xl border border-white/15 bg-[#0f0a35]/75 px-5 py-4 backdrop-blur-xl">
      <Link href="/home" className="text-lg font-semibold text-white">
        DiplomApp
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm text-white/85">
          Логин: <span className="font-medium">{login}</span>
        </div>
        <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm text-white/85">
          Роль: <span className="font-medium">{roleLabel[role]}</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Дашборд
        </Link>
        <Link
          href="/profile"
          className="rounded-full border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Профиль
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
