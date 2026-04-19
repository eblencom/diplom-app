import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth-form";
import { LandingFooter } from "@/app/components/landing-footer";
import {
  LandingCompaniesBlock,
  LandingNewsPreviewBlock,
  LandingRegisterCta,
} from "@/app/components/landing-public-blocks";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCompaniesForNewsFilter, getLatestNewsPreview } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";
import { SITE_DISPLAY_NAME, SITE_UTP } from "@/lib/site-branding";

export default async function Home() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/home");
  }

  const [companies, newsPreview] = await Promise.all([
    getCompaniesForNewsFilter(),
    getLatestNewsPreview(10),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05021b] px-4 pb-16 pt-6 text-white sm:px-6 md:pt-8">
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[320px] w-[600px] -translate-x-1/2 rounded-full bg-fuchsia-500/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-220px] left-[-100px] h-[400px] w-[400px] rounded-full bg-violet-700/45 blur-3xl" />
      <div className="pointer-events-none absolute right-[-100px] top-[30%] h-[350px] w-[350px] rounded-full bg-indigo-600/40 blur-3xl" />

      <div className={`relative z-10 ${APP_CONTENT_MAX_CLASS}`}>
        {/* Верх: УТП слева, форма входа/регистрации справа; ниже — большое фото */}
        <div className="mt-4 grid gap-10 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:items-start lg:gap-12">
          <div className="max-w-2xl lg:pt-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/90">
              Презентация платформы
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white drop-shadow md:text-5xl md:leading-tight">
              {SITE_DISPLAY_NAME}
            </h1>
            <p className="mt-5 text-left text-base leading-relaxed text-white/80 md:text-lg">
              {SITE_UTP}
            </p>
          </div>
          <div id="auth-block" className="w-full scroll-mt-24 justify-self-stretch lg:justify-self-end">
            <AuthForm />
          </div>
        </div>

        <section className="relative mt-10 overflow-hidden rounded-3xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:mt-12">
          <div className="relative aspect-[21/9] min-h-[220px] w-full md:min-h-[320px]">
            <Image
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a628aa6?auto=format&fit=crop&w=2000&q=80"
              alt="Финансовые графики и торговый терминал"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1600px"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05021b]/90 via-transparent to-[#12082c]/30" />
          </div>
        </section>

        <LandingCompaniesBlock companies={companies} />
        <LandingNewsPreviewBlock items={newsPreview} />
        <LandingRegisterCta />
        <div className="mt-4 w-full">
          <LandingFooter />
        </div>
      </div>
    </main>
  );
}
