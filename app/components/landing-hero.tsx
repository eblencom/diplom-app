import Image from "next/image";
import Link from "next/link";
import heroBg from "../../imgs/wallpapersden.com_k-nebula-space_wxl.jpg";
import previewImg from "../../imgs/Preview.png";
import { SITE_DISPLAY_NAME, SITE_UTP } from "@/lib/site-branding";

type LandingHeroProps = {
  issuersCount: number;
};

const HERO_FEATURES = [
  ["Новости", "Фильтры по компаниям и категориям"],
  ["Прогнозы", "Результат, winrate и результативность"],
  ["Дашборд", "Графики и экспорт отчётов"],
] as const;

export function LandingHero({ issuersCount }: LandingHeroProps) {
  return (
    <section className="relative left-1/2 -mt-3 min-h-svh w-screen -translate-x-1/2 overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)] sm:-mt-5">
      <div className="pointer-events-none absolute inset-0 min-h-[280px] sm:min-h-[320px]">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          className="object-cover object-[50%_35%]"
          sizes="100vw"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#05021b]/88 via-[#05021b]/82 to-[#05021b]/92"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-svh max-w-[1680px] gap-8 px-4 py-10 text-left sm:px-6 sm:py-12 md:px-8 md:py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-center lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85 sm:text-sm">
            Финансовая аналитика
          </p>

          <div className="mt-5 flex w-full max-w-2xl flex-col items-start sm:mt-7">
            <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              {SITE_DISPLAY_NAME}
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-xl font-semibold leading-snug text-white/95 sm:text-2xl md:text-3xl md:leading-tight">
              {SITE_UTP}
            </p>
            <p className="mt-5 flex max-w-xl flex-col items-start gap-2 text-sm text-white/68 sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1 sm:text-base">
              <span className="inline-flex flex-wrap items-center gap-x-1">
                <span className="font-mono font-semibold tabular-nums text-white/90">{issuersCount}</span>
                <span>компаний</span>
              </span>
              <span className="hidden text-white/25 sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-white/82">
                Источник новостей:{" "}
                <span className="font-semibold text-emerald-200/95">Investing.com</span>
              </span>
              <span className="hidden text-white/25 sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-white/82">
                Источник цен:{" "}
                <span className="font-semibold text-emerald-200/95">MOEX</span>
              </span>
            </p>
            <ul className="mt-7 grid w-full gap-3 sm:grid-cols-3">
              {HERO_FEATURES.map(([title, text]) => (
                <li
                  key={title}
                  className="rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-snug text-white/62">{text}</p>
                </li>
              ))}
            </ul>
            <Link
              href="#latest-news"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-500/15 px-6 py-3 text-base font-semibold text-cyan-50 transition hover:bg-cyan-500/25"
            >
              Перейти к новостям
            </Link>
          </div>
        </div>

        <div className="relative min-h-[300px] overflow-hidden rounded-3xl sm:min-h-[420px] lg:min-h-[560px]">
          <Image
            src={previewImg}
            alt="Превью приложения"
            fill
            priority
            className="object-contain object-center"
            sizes="(max-width: 1024px) 100vw, 48vw"
          />
        </div>
      </div>
    </section>
  );
}
