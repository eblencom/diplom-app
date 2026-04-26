import type { NewsPreviewPublic } from "@/lib/news";

type Company = { id: number; name: string; ticker: string };

const CAPABILITY_CHIPS = [
  "Новости и фильтры",
  "Котировки MOEX",
  "Прогнозы и винрейт",
  "Telegram по тикерам",
] as const;

/** Короткий блок под hero — без второго «простынного» экрана. */
export function LandingCapabilitiesChips() {
  return (
    <section className="mt-6 rounded-2xl border border-[#e8e0d4]/25 bg-[#f4efe6]/[0.12] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mt-8 sm:px-7 sm:py-7">
      <h2 className="text-balance text-lg font-bold tracking-tight text-[#f8f3ea] sm:text-xl">
        После входа
      </h2>
      <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-[#e8e0d4]/80">
        Рабочий стол с фильтрами, котировками и статистикой прогнозов — всё в одном месте.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-2.5">
        {CAPABILITY_CHIPS.map((label) => (
          <li
            key={label}
            className="rounded-xl border border-[#e8e0d4]/20 bg-[#0c0824]/55 px-3 py-2 text-xs font-medium text-[#f5efe6]/90 backdrop-blur-sm sm:px-3.5 sm:text-sm"
          >
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function excerpt(text: string, max: number) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) {
    return line;
  }
  return `${line.slice(0, max - 1)}…`;
}

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function LandingCompaniesBlock({
  companies,
  sectionId,
}: {
  companies: Company[];
  /** Якорь для ссылок с hero (например #issuers) */
  sectionId?: string;
}) {
  return (
    <section className="mt-10 scroll-mt-20 sm:mt-14 sm:scroll-mt-24" id={sectionId}>
      <h2 className="text-balance text-lg font-semibold text-white sm:text-xl">Компании</h2>
      <ul className="mt-4 flex flex-wrap gap-2 sm:mt-6">
        {companies.map((c) => (
          <li
            key={c.id}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs leading-snug text-white/85 sm:py-1.5"
          >
            <span className="font-semibold text-cyan-200/90">{c.ticker}</span>
            <span className="text-white/50"> · </span>
            <span>{c.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingNewsPreviewBlock({ items }: { items: NewsPreviewPublic[] }) {
  if (items.length === 0) {
    return (
      <section className="mt-10 sm:mt-12">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Свежие новости</h2>
        <p className="mt-3 text-sm text-white/55">Пока нет записей — зайдите позже после работы парсера.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 sm:mt-12">
      <h2 className="text-balance text-lg font-semibold text-white sm:text-xl">Последние новости</h2>
      <p className="mt-2 text-pretty text-sm text-white/60">Полноценные публикации после входа в аккаунт</p>
      <ul className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
        {items.map((n) => (
          <li
            key={n.id}
            className="rounded-2xl border border-white/12 bg-[#0b0620]/80 px-3 py-3 text-sm text-white/80 sm:px-4"
          >
            <div className="flex flex-col gap-1 text-xs text-white/50 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
              <span className="min-w-0 break-words">
                {n.companyName} · <span className="font-mono text-cyan-200/80">{n.ticker}</span>
              </span>
              <time className="shrink-0 sm:text-right" dateTime={n.datetime.toISOString()}>
                {formatWhen(n.datetime)}
              </time>
            </div>
            <p className="mt-2 text-pretty text-[15px] leading-relaxed text-white/85 sm:text-sm">
              {excerpt(n.text, 220)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingRegisterCta() {
  return (
    <section className="mt-8 rounded-t-3xl rounded-b-none border border-b-0 border-[#e8e0d4]/28 bg-gradient-to-br from-[#f4efe6]/[0.18] via-violet-950/45 to-[#06041a] px-5 pb-8 pt-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:mt-10 sm:px-8 sm:pb-10 sm:pt-10 md:px-12 md:pb-12 md:pt-12">
      <h2 className="text-balance text-xl font-semibold text-[#faf6ef] sm:text-2xl md:text-3xl">
        Получите доступ к анализу
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-white/72 sm:mt-5 sm:text-base md:max-w-3xl">
        Зарегистрируйтесь, чтобы сохранять прогнозы по новостям, видеть статистику
        (винрейт), минутные графики цены MOEX и персональную ленту на главной.
      </p>
      <a
        href="#auth-block"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 bg-white px-7 py-3 text-sm font-semibold text-[#12082c] transition hover:bg-white/90 sm:mt-8 sm:px-8 sm:text-base"
      >
        Зарегистрироваться
      </a>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-xs leading-relaxed text-white/50 sm:mt-5 sm:text-sm">
        В форме выше переключитесь на вкладку «Регистрация», если вы ещё не в системе.
      </p>
    </section>
  );
}
