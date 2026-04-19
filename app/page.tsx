import { redirect } from "next/navigation";
import { LandingHero } from "@/app/components/landing-hero";
import {
  LandingCapabilitiesChips,
  LandingCompaniesBlock,
  LandingNewsPreviewBlock,
  LandingRegisterCta,
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
    <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden bg-[#05021b] px-4 pb-14 pt-4 text-white sm:px-6 sm:pb-16 sm:pt-5">
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[320px] w-[600px] -translate-x-1/2 rounded-full bg-fuchsia-500/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-220px] left-[-100px] h-[400px] w-[400px] rounded-full bg-violet-700/45 blur-3xl" />
      <div className="pointer-events-none absolute right-[-100px] top-[30%] h-[350px] w-[350px] rounded-full bg-indigo-600/40 blur-3xl" />

      <div className={`relative z-10 ${APP_CONTENT_MAX_CLASS}`}>
        <LandingHero issuersCount={companies.length} newsPreviewCount={newsPreview.length} />
        <LandingCapabilitiesChips />

        <LandingCompaniesBlock companies={companies} sectionId="issuers" />
        <LandingNewsPreviewBlock items={newsPreview} />
        <LandingRegisterCta />
      </div>
    </main>
  );
}
