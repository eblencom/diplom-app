"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Company = { id: number; name: string; ticker: string };

type Props = {
  siteLogin: string;
  initialTgUsername: string;
  initialTgChatId: number | null;
  initialAlertCompanyIds: number[];
  companies: Company[];
};

function botLink() {
  const name = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  if (!name) {
    return null;
  }
  const clean = name.replace(/^@/, "");
  return `https://t.me/${clean}`;
}

export function ProfileTelegramPreferences({
  siteLogin,
  initialTgUsername,
  initialTgChatId,
  initialAlertCompanyIds,
  companies,
}: Props) {
  const [tgUsername, setTgUsername] = useState(initialTgUsername);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(initialAlertCompanyIds),
  );
  const [tgMsg, setTgMsg] = useState("");
  const [tgPending, setTgPending] = useState(false);
  const [alertsMsg, setAlertsMsg] = useState("");
  const [alertsPending, setAlertsPending] = useState(false);

  useEffect(() => {
    setTgUsername(initialTgUsername);
  }, [initialTgUsername]);

  useEffect(() => {
    setSelected(new Set(initialAlertCompanyIds));
  }, [initialAlertCompanyIds]);

  const link = useMemo(() => botLink(), []);

  async function onSaveTg(event: FormEvent) {
    event.preventDefault();
    setTgMsg("");
    setTgPending(true);
    try {
      const response = await fetch("/api/profile/tg", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tgUsername }),
      });
      const data = (await response.json()) as { error?: string; tgUsername?: string };
      if (!response.ok) {
        setTgMsg(data.error ?? "Не удалось сохранить.");
        return;
      }
      if (typeof data.tgUsername === "string") {
        setTgUsername(data.tgUsername);
      }
      setTgMsg("Сохранено.");
    } catch {
      setTgMsg("Ошибка сети.");
    } finally {
      setTgPending(false);
    }
  }

  async function onSaveAlerts(event: FormEvent) {
    event.preventDefault();
    setAlertsMsg("");
    setAlertsPending(true);
    try {
      const companyIds = [...selected];
      const response = await fetch("/api/profile/ticker-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds }),
      });
      const data = (await response.json()) as { error?: string; companyIds?: number[] };
      if (!response.ok) {
        setAlertsMsg(data.error ?? "Не удалось сохранить.");
        return;
      }
      if (Array.isArray(data.companyIds)) {
        setSelected(new Set(data.companyIds));
      }
      setAlertsMsg("Список тикеров для рассылки обновлён.");
    } catch {
      setAlertsMsg("Ошибка сети.");
    } finally {
      setAlertsPending(false);
    }
  }

  function toggleCompany(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-[#0a061f]/60 to-black/30 p-4 sm:space-y-8 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">Telegram</h2>
        <p className="mt-2 text-sm text-white/65">
          Укажите ваш Telegram username (как в профиле Telegram, без @). После привязки чата бот
          раз в минуту пришлёт цены MOEX по выбранным тикерам и раз в 10 минут - новости по ним
          (если новых нет, придёт короткое уведомление).
        </p>
        {initialTgChatId != null ? (
          <p className="mt-2 text-sm font-medium text-emerald-300/90">
            Чат с ботом привязан - рассылка будет приходить сюда.
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-200/85">
            Чат ещё не привязан: откройте бота и отправьте команду с вашим логином сайта (см.
            ниже).
          </p>
        )}
      </div>

      <form onSubmit={onSaveTg} className="rounded-2xl border border-white/12 bg-black/25 p-5">
        <label className="block">
          <span className="text-sm text-white/70">Telegram username</span>
          <input
            value={tgUsername}
            onChange={(e) => setTgUsername(e.target.value)}
            placeholder="username без @"
            className="mt-2 w-full max-w-md rounded-xl border border-white/20 bg-[#151046] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-cyan-500/40"
          />
        </label>
        {tgMsg && <p className="mt-3 text-sm text-white/80">{tgMsg}</p>}
        <button
          type="submit"
          disabled={tgPending}
          className="mt-4 rounded-full border border-cyan-400/40 px-5 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/10 disabled:opacity-50"
        >
          {tgPending ? "Сохранение…" : "Сохранить username"}
        </button>
      </form>

      <form onSubmit={onSaveAlerts} className="rounded-2xl border border-white/12 bg-black/25 p-5">
        <h3 className="text-lg font-medium text-white">Тикеры для рассылки в Telegram</h3>
        <p className="mt-1 text-sm text-white/60">
          Отметьте компании: раз в минуту - котировки MOEX, раз в 10 минут - новые новости по этим
          эмитентам или текст о том, что новых новостей нет.
        </p>
        <div className="scrollbar-none mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-3">
          {companies.map((c) => (
            <label
              key={c.id}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition hover:border-cyan-500/30 hover:bg-cyan-500/[0.07] focus-within:ring-2 focus-within:ring-cyan-400/40"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleCompany(c.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 border-white/28 bg-gradient-to-br from-white/[0.07] to-black/50 shadow-inner transition peer-checked:border-cyan-400/85 peer-checked:from-cyan-500/35 peer-checked:to-cyan-700/45 peer-checked:shadow-[0_0_14px_rgba(34,211,238,0.28)] peer-checked:[&>svg]:opacity-100"
              >
                <svg
                  viewBox="0 0 14 14"
                  className="size-3.5 text-cyan-50 opacity-0 transition"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7.5 6 10.5 11 4" />
                </svg>
              </span>
              <span className="min-w-0 font-mono text-sm font-semibold text-cyan-200/95">{c.ticker}</span>
              <span className="min-w-0 flex-1 text-sm leading-snug text-white/78">{c.name}</span>
            </label>
          ))}
        </div>
        {alertsMsg && <p className="mt-3 text-sm text-white/80">{alertsMsg}</p>}
        <button
          type="submit"
          disabled={alertsPending}
          className="mt-4 rounded-full border border-white/35 px-5 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
        >
          {alertsPending ? "Сохранение…" : "Сохранить выбор тикеров"}
        </button>
      </form>

      <div className="rounded-2xl border border-violet-400/25 bg-violet-950/25 p-5 text-sm text-white/75">
        <p className="font-medium text-white">Как привязать Telegram</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Сохраните username и список тикеров на этой странице.</li>
          <li>
            {link ? (
              <>
                Откройте бота:{" "}
                <a
                  href={link}
                  className="break-all text-cyan-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {link}
                </a>
              </>
            ) : (
              <>
                Откройте вашего бота в Telegram (задайте в .env{" "}
                <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>{" "}
                без @).
              </>
            )}
          </li>
          <li>
            Отправьте боту одно сообщение (с аккаунта Telegram, username которого вы указали
            выше):
            <code className="mt-2 block rounded-lg bg-black/40 px-3 py-2 font-mono text-cyan-100">
              /start {siteLogin}
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}
