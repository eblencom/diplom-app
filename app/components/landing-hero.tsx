import Image from "next/image";
import Link from "next/link";
import heroBg from "../../imgs/wallpapersden.com_k-nebula-space_wxl.jpg";
import { AuthForm } from "@/app/auth-form";
import { SITE_DISPLAY_NAME, SITE_UTP } from "@/lib/site-branding";

type LandingHeroProps = {
  issuersCount: number;
  newsPreviewCount: number;
};

/** Центрированный УТП и форма входа под ним; фон — изображение на всю карточку. */
export function LandingHero({ issuersCount, newsPreviewCount }: LandingHeroProps) {
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

      <div className="relative z-10 flex flex-col items-center px-5 py-10 text-center sm:px-8 sm:py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-200/85">
          Вход в систему
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
          {SITE_DISPLAY_NAME}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/82 sm:text-[15px]">
          {SITE_UTP}
        </p>
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/50">
          <span>
            <span className="font-mono font-semibold tabular-nums text-white/85">{issuersCount}</span>{" "}
            эмитентов
          </span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span>
            <span className="font-mono font-semibold tabular-nums text-white/85">{newsPreviewCount}</span>{" "}
            в превью
          </span>
          <span className="text-white/25" aria-hidden>
            ·
          </span>
          <span className="text-emerald-200/80">MOEX</span>
        </p>
        <Link
          href="#issuers"
          className="mt-4 text-sm font-medium text-cyan-200/90 underline-offset-4 hover:text-cyan-100 hover:underline"
        >
          Эмитенты и лента новостей ниже ↓
        </Link>

        <div id="auth-block" className="scroll-mt-20 mt-8 w-full max-w-md">
          <AuthForm variant="landing" />
        </div>
      </div>
    </section>
  );
}
