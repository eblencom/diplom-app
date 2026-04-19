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
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#08051c]/55 px-4 py-4 sm:px-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/45">
        После входа
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {CAPABILITY_CHIPS.map((label) => (
          <li
            key={label}
            className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs text-white/75"
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
    <section className="mt-14 scroll-mt-24" id={sectionId}>
      <h2 className="text-xl font-semibold text-white">Эмитенты в базе</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Парсер новостей и цены подтягиваются по тикерам с площадок, указанных для каждой
        компании.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {companies.map((c) => (
          <li
            key={c.id}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85"
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
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">Свежие новости</h2>
        <p className="mt-3 text-sm text-white/55">Пока нет записей — зайдите позже после работы парсера.</p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-white">Последние новости</h2>
      <p className="mt-2 text-sm text-white/60">
        Фрагменты публикаций без интерактива — полный текст и прогнозы доступны после входа.
      </p>
      <ul className="mt-6 space-y-4">
        {items.map((n) => (
          <li
            key={n.id}
            className="rounded-2xl border border-white/12 bg-[#0b0620]/80 px-4 py-3 text-sm text-white/80"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-white/50">
              <span>
                {n.companyName} · <span className="font-mono text-cyan-200/80">{n.ticker}</span>
              </span>
              <time dateTime={n.datetime.toISOString()}>{formatWhen(n.datetime)}</time>
            </div>
            <p className="mt-2 text-white/85">{excerpt(n.text, 220)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingRegisterCta() {
  return (
    <section className="mt-14 rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-950/50 to-[#08051c] p-6 text-center md:p-10">
      <h2 className="text-lg font-semibold text-white md:text-xl">Получите доступ к анализу</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70">
        Зарегистрируйтесь, чтобы сохранять прогнозы по новостям, видеть статистику
        (винрейт), минутные графики цены MOEX и персональную ленту на главной.
      </p>
      <a
        href="#auth-block"
        className="mt-6 inline-flex rounded-full border border-white/40 bg-white px-6 py-2.5 text-sm font-semibold text-[#12082c] transition hover:bg-white/90"
      >
        Зарегистрироваться
      </a>
      <p className="mt-3 text-xs text-white/45">
        В форме выше переключитесь на вкладку «Регистрация», если вы ещё не в системе.
      </p>
    </section>
  );
}
