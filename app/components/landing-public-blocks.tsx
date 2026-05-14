import Image from "next/image";
import type { NewsPreviewPublic } from "@/lib/news";
import { CompanyLogo } from "@/app/components/company-logo";
import { formatDisplayDateTime } from "@/lib/display-date";

type Company = { id: number; name: string; ticker: string };

const CAPABILITY_CARDS = [
  {
    icon: "1",
    title: "Новости и фильтры",
    text: "Лента публикаций по компаниям, категориям и избранным ценам.",
  },
  {
    icon: "2",
    title: "Цены MOEX",
    text: "Свежие цены и минутные значения для проверки реакции рынка.",
  },
  {
    icon: "3",
    title: "Прогнозы и винрейт",
    text: "Сохранение прогнозов, результат, результативность и статистика на дашборде.",
  },
  {
    icon: "4",
    title: "Telegram по ценам",
    text: "Уведомления о ценах и новых новостях по выбранным компаниям.",
  },
] as const;

export function LandingCapabilitiesChips() {
  return (
    <section className="mt-14 text-center sm:mt-20">
      <h2 className="text-balance text-2xl font-bold tracking-tight text-[#f8f3ea] sm:text-3xl">
        После входа
      </h2>
      <p className="mx-auto mt-2 max-w-3xl text-pretty text-base leading-relaxed text-[#e8e0d4]/80 sm:text-lg">
        Рабочий стол с фильтрами, ценами и статистикой прогнозов — всё в одном месте.
      </p>
      <ul className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITY_CARDS.map((card) => (
          <li
            key={card.title}
            className="group relative overflow-hidden rounded-2xl border border-[#e8e0d4]/20 bg-[#f4efe6]/[0.1] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-500/[0.08] hover:shadow-[0_18px_50px_rgba(34,211,238,0.12)]"
          >
            <span
              className="absolute right-3 top-3 size-8 rounded-full bg-cyan-300/10 blur-sm transition duration-500 group-hover:scale-150 group-hover:bg-cyan-300/20"
              aria-hidden
            />
            <Image
              src={`/api/after-login-icon/${card.icon}`}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="relative size-12 object-contain"
              aria-hidden
            />
            <h3 className="relative mt-3 text-lg font-semibold text-white">{card.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-white/62 sm:text-base">{card.text}</p>
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
  return formatDisplayDateTime(d);
}

export function LandingCompaniesBlock({
  companies,
  sectionId,
}: {
  companies: Company[];
  sectionId?: string;
}) {
  return (
    <section className="mt-14 scroll-mt-20 text-center sm:mt-20 sm:scroll-mt-24" id={sectionId}>
      <h2 className="text-balance text-2xl font-semibold text-white sm:text-3xl">Компании</h2>
      <ul className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6">
        {companies.map((c) => (
          <li
            key={c.id}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm leading-snug text-white/85 sm:py-2"
          >
            <CompanyLogo ticker={c.ticker} name={c.name} size={22} />
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
      <section id="latest-news" className="mt-16 scroll-mt-20 text-center sm:mt-24 sm:scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Свежие новости</h2>
        <p className="mt-3 text-base text-white/55">Пока нет записей — зайдите позже после работы парсера.</p>
      </section>
    );
  }

  const mid = Math.ceil(items.length / 2);
  const columns = [items.slice(0, mid), items.slice(mid)];

  return (
    <section id="latest-news" className="mt-16 scroll-mt-20 text-center sm:mt-24 sm:scroll-mt-24">
      <h2 className="text-balance text-2xl font-semibold text-white sm:text-3xl">Последние новости</h2>
      <p className="mt-2 text-pretty text-base text-white/60 sm:text-lg">Полноценные публикации после входа в аккаунт</p>
      <div className="mt-4 grid gap-3 text-left sm:mt-6 sm:gap-4 lg:grid-cols-2">
        {columns.map((column, idx) => (
          <ul key={idx} className="space-y-3 sm:space-y-4">
            {column.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-white/12 bg-[#0b0620]/80 px-3 py-3 text-base text-white/80 sm:px-4"
              >
                <div className="flex flex-col gap-1 text-sm text-white/50 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
                  <span className="inline-flex min-w-0 items-center gap-2 break-words">
                    <CompanyLogo ticker={n.ticker} name={n.companyName} size={22} />
                    {n.companyName} · <span className="font-mono text-cyan-200/80">{n.ticker}</span>
                  </span>
                  <time className="shrink-0 sm:text-right" dateTime={n.datetime.toISOString()}>
                    {formatWhen(n.datetime)}
                  </time>
                </div>
                <p className="mt-2 text-pretty text-base leading-relaxed text-white/85">
                  {excerpt(n.text, 220)}
                </p>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
