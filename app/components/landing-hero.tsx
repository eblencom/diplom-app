import Image from "next/image";
import Link from "next/link";
import heroBg from "../../imgs/wallpapersden.com_k-nebula-space_wxl.jpg";
import { AuthForm } from "@/app/auth-form";
import { SITE_DISPLAY_NAME, SITE_UTP } from "@/lib/site-branding";

type LandingHeroProps = {
  issuersCount: number;
};

export function LandingHero({ issuersCount }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/18 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
      <div className="pointer-events-none absolute inset-0 min-h-[280px] sm:min-h-[320px]">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          className="object-cover object-[50%_35%]"
          sizes="(max-width: 768px) 100vw, min(1680px, 100vw)"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#05021b]/88 via-[#05021b]/82 to-[#05021b]/92"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-10 md:px-8 md:py-12">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/85 sm:text-[11px]">
          Вход в систему
        </p>

        <div className="mt-6 flex w-full max-w-xl flex-col items-center sm:mt-8">
          <h1 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
            {SITE_DISPLAY_NAME}
          </h1>
          <p className="mt-4 max-w-xl text-balance px-1 text-[15px] font-semibold leading-snug text-white/95 sm:mt-5 sm:text-lg md:text-xl md:leading-snug">
            {SITE_UTP}
          </p>
          <p className="mt-4 flex max-w-lg flex-col items-center gap-2 text-xs text-white/60 sm:mt-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-1 sm:text-sm sm:text-white/55">
            <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
              <span className="font-mono font-semibold tabular-nums text-white/90">{issuersCount}</span>
              <span>эмитентов</span>
            </span>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              ·
            </span>
            <span className="text-center text-white/80 sm:text-left">
              Источник новостей:{" "}
              <span className="font-semibold text-emerald-200/95">Investing.com</span>
            </span>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              ·
            </span>
            <span className="font-medium text-emerald-200/85">MOEX</span>
          </p>
          <Link
            href="#issuers"
            className="mt-4 text-sm font-medium text-cyan-200/90 underline-offset-4 hover:text-cyan-100 hover:underline sm:mt-5"
          >
            Эмитенты и лента новостей ниже ↓
          </Link>
        </div>

        <div id="auth-block" className="scroll-mt-20 mt-8 w-full max-w-md sm:mt-10">
          <AuthForm variant="landing" />
        </div>
      </div>
    </section>
  );
}
