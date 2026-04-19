import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth-form";
import { LandingFooter } from "@/app/components/landing-footer";
import {
  LandingCompaniesBlock,
  LandingNewsPreviewBlock,
  LandingRegisterCta,
} from "@/app/components/landing-public-blocks";
import { getCompaniesForNewsFilter, getLatestNewsPreview } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
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
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:mt-6">
          <div className="relative aspect-[21/9] min-h-[200px] w-full md:min-h-[280px]">
            <Image
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a628aa6?auto=format&fit=crop&w=2000&q=80"
              alt="Финансовые графики и торговый терминал"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1024px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05021b] via-[#05021b]/75 to-[#12082c]/55" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-cyan-200/90">
                Презентация платформы
              </p>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white drop-shadow md:text-5xl md:leading-tight">
                {SITE_DISPLAY_NAME}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-white/85 drop-shadow md:text-base">
                {SITE_UTP}
              </p>
            </div>
          </div>
        </section>

        <div id="auth-block" className="mt-10 scroll-mt-24 md:mt-12">
          <AuthForm />
        </div>

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
