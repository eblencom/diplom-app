import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth-form";
import { LandingHero } from "@/app/components/landing-hero";
import {
  LandingCapabilitiesChips,
  LandingCompaniesBlock,
  LandingNewsPreviewBlock,
} from "@/app/components/landing-public-blocks";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { getCompaniesForNewsFilter, getLatestNewsPreview } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";

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
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05021b]"
        aria-hidden
      >
        <div className="absolute left-1/2 top-[-180px] h-[280px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/45 blur-2xl will-change-transform" />
        <div className="absolute bottom-[-200px] left-[-80px] h-[360px] w-[360px] rounded-full bg-violet-700/40 blur-2xl will-change-transform" />
        <div className="absolute right-[-80px] top-[28%] h-[300px] w-[300px] rounded-full bg-indigo-600/35 blur-2xl will-change-transform" />
      </div>
      <main className="relative z-10 flex min-h-0 w-full max-w-full flex-col overflow-x-clip bg-transparent px-3 pb-0 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-5 sm:pt-5 md:px-6">
      <div className={`relative ${APP_CONTENT_MAX_CLASS}`}>
        <LandingHero issuersCount={companies.length} />
        <LandingCapabilitiesChips />
        <LandingCompaniesBlock companies={companies} sectionId="issuers" />
        <LandingNewsPreviewBlock items={newsPreview} />
        <section
          id="auth-block"
          className="mt-16 scroll-mt-20 flex justify-center rounded-t-3xl rounded-b-none border border-b-0 border-[#e8e0d4]/28 bg-gradient-to-br from-[#f4efe6]/[0.12] via-violet-950/35 to-[#06041a] px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mt-24 sm:px-8 sm:py-10 md:px-12 md:py-12"
        >
          <AuthForm variant="landing" />
        </section>
      </div>
    </main>
    </>
  );
}
