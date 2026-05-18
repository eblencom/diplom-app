import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/app-header";
import { HomeScrollShell } from "@/app/components/home-scroll-shell";
import { HomeWinrateAside } from "@/app/components/home-winrate-aside";
import { NewsPredictPanel } from "@/app/components/news-predict-panel";
import { NewsPriceBefore } from "@/app/components/news-price-before";
import { TickerTradingViewLink } from "@/app/components/ticker-tradingview-link";
import { UserWinrateCard } from "@/app/components/user-winrate-card";
import { CompanyLogo } from "@/app/components/company-logo";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { isCategorySlug } from "@/lib/company-categories";
import { buildHomeNewsQuery } from "@/lib/home-news-query";
import { formatDisplayDateTime } from "@/lib/display-date";
import {
  getUserNewsFavoriteCategorySlugs,
  getUserNewsFavoriteCompanyIds,
} from "@/lib/news-favorites";
import { categoryLabelsForSlugs, getCompaniesForNewsFilter, getNewsPage } from "@/lib/news";
import { validateNewsDateParam } from "@/lib/news-date-param";
import { getCurrentSession } from "@/lib/session";
import { startNewsParserScheduler } from "@/lib/news-parser-scheduler";
import type { UserPredictOnNews } from "@/lib/predicts-types";
import { getUserWinrateStats } from "@/lib/user-winrate";

type HomePageProps = {
  searchParams: Promise<{
    page?: string;
    company?: string;
    category?: string;
    favorites?: string;
    from?: string;
    to?: string;
  }>;
};

function formatDate(date: Date) {
  return formatDisplayDateTime(date);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function newsArticleTone(predicts: UserPredictOnNews[]) {
  const closed = predicts.filter((p) => p.status === "closed");
  if (closed.length === 0) {
    return "pending" as const;
  }
  let win = false;
  let lose = false;
  let neutral = false;
  for (const p of closed) {
    if (p.result === "win") {
      win = true;
    } else if (p.result === "lose") {
      lose = true;
    } else if (p.result === "neutral") {
      neutral = true;
    }
  }
  if (lose) {
    return "bad" as const;
  }
  if (win) {
    return "good" as const;
  }
  if (neutral) {
    return "milky" as const;
  }
  return "pending" as const;
}

function newsArticleClass(tone: ReturnType<typeof newsArticleTone>) {
  const pad = "rounded-2xl border p-5 sm:p-7";
  switch (tone) {
    case "good":
      return `${pad} border-emerald-500/35 bg-gradient-to-br from-emerald-950/55 via-[#0a1a12]/92 to-black/50 shadow-[0_12px_48px_rgba(16,185,129,0.12)]`;
    case "bad":
      return `${pad} border-rose-500/35 bg-gradient-to-br from-rose-950/50 via-[#1a0a0e]/92 to-black/50 shadow-[0_12px_48px_rgba(244,63,94,0.1)]`;
    case "milky":
      return `${pad} border-[#e8e0d4]/28 bg-gradient-to-br from-[#f4efe6]/[0.14] via-[#10082c]/88 to-[#06040f]/95 shadow-[0_12px_40px_rgba(0,0,0,0.25)]`;
    default:
      return `${pad} border-cyan-500/20 bg-gradient-to-br from-[#10082c]/95 via-[#0a061f]/90 to-black/50 shadow-[0_12px_48px_rgba(34,211,238,0.06)]`;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  startNewsParserScheduler();

  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const params = await searchParams;
  const currentPage = Number(params.page ?? "1");

  const companyRaw = params.company?.trim() ?? "";
  let companyId: number | undefined;
  if (/^\d+$/.test(companyRaw)) {
    const parsed = Number(companyRaw);
    if (parsed > 0) {
      companyId = parsed;
    }
  }

  const categoryRaw = params.category?.trim() ?? "";
  const categoryFilter = isCategorySlug(categoryRaw) ? categoryRaw : undefined;

  const favRaw = params.favorites?.trim().toLowerCase() ?? "";
  const favoritesOnly = favRaw === "1" || favRaw === "true" || favRaw === "yes";

  const dateFrom = validateNewsDateParam(params.from?.trim());
  const dateTo = validateNewsDateParam(params.to?.trim());
  const datePart = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const companies = await getCompaniesForNewsFilter();

  if (!favoritesOnly && companyId != null && categoryFilter != null) {
    const co = companies.find((c) => c.id === companyId);
    if (co && !co.categorySlugs.includes(categoryFilter)) {
      redirect(
        `/home${buildHomeNewsQuery({
          page: Math.max(1, currentPage),
          category: categoryFilter,
          dateFrom,
          dateTo,
        })}`,
      );
    }
  }

  const listFilters = favoritesOnly
    ? Object.keys(datePart).length > 0
      ? { favoritesOnly: true as const, ...datePart }
      : { favoritesOnly: true as const }
    : companyId != null || categoryFilter != null || Object.keys(datePart).length > 0
      ? {
          ...(companyId != null ? { companyId } : {}),
          ...(categoryFilter != null ? { category: categoryFilter } : {}),
          ...datePart,
        }
      : undefined;

  const [newsPage, winrateInitial, favoriteCompanyIds, favoriteCategories] = await Promise.all([
      // parallel: lenta, vinrejt, izbrannoe — kompanii uzhe zagruzheny
      getNewsPage(currentPage, 10, session.userId, listFilters),
      getUserWinrateStats(session.userId),
      getUserNewsFavoriteCompanyIds(session.userId),
      getUserNewsFavoriteCategorySlugs(session.userId),
    ]);

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#05021b] px-4 py-6 text-white sm:px-6 sm:py-8">
      <section className={APP_CONTENT_MAX_CLASS}>
        <div className="mb-5 sm:mb-6">
          <AppHeader login={session.login} role={session.role} />
        </div>

        <HomeScrollShell
          companies={companies}
          favoriteCompanyIds={favoriteCompanyIds}
          favoriteCategories={favoriteCategories}
          favoritesFilterActive={favoritesOnly}
        >
        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-4 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl sm:p-7 md:p-9">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="space-y-4">
            {newsPage.items.length === 0 && (
              <div className="rounded-2xl border border-white/15 bg-black/20 p-5 text-white/70">
                Пока нет новостей. После первого прохода парсера новости появятся
                здесь.
              </div>
            )}

            {newsPage.items.map((item) => (
              <article
                key={item.id}
                className={newsArticleClass(newsArticleTone(item.predicts))}
              >
                {(() => {
                  const paragraphs = splitParagraphs(item.text);
                  const firstParagraph = paragraphs[0] ?? item.text;
                  const restParagraphs = paragraphs.slice(1);
                  const categoryTags = categoryLabelsForSlugs(item.categorySlugs);

                  return (
                    <>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 text-base text-white/68">
                            <CompanyLogo ticker={item.ticker} name={item.companyName} size={28} />
                            <span className="font-bold text-white">{item.companyName}</span>
                          </div>
                          <div className="mt-1 text-sm text-white/60">{formatDate(item.datetime)}</div>
                          {categoryTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {categoryTags.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-cyan-100/90"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:max-w-[520px] sm:items-end sm:text-right">
                          <div className="text-base font-semibold text-white/90 sm:self-end">{item.ticker}</div>
                          <NewsPriceBefore newsId={item.id} />
                          <TickerTradingViewLink ticker={item.ticker} />
                        </div>
                      </div>

                      <NewsPredictPanel newsId={item.id} initialPredicts={item.predicts} />

                      <p className="mt-5 mb-4 px-2 text-lg leading-relaxed text-white/90 sm:mt-6 sm:mb-5 sm:px-4">
                        {firstParagraph}
                      </p>

                      {restParagraphs.length > 0 && (
                        <details className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                          <summary className="cursor-pointer text-base text-white/80 hover:text-white">
                            Подробнее
                          </summary>
                          <div className="mt-3 space-y-3">
                            {restParagraphs.map((paragraph, idx) => (
                              <p key={`${item.id}-${idx}`} className="text-base leading-relaxed text-white/80">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </>
                  );
                })()}
              </article>
            ))}
            </div>

            <HomeWinrateAside>
              <UserWinrateCard initial={winrateInitial} />
            </HomeWinrateAside>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <p className="text-base text-white/65">
              Страница {newsPage.page} из {newsPage.totalPages}
            </p>
            <Link
              href={`/home${buildHomeNewsQuery({
                page: Math.max(1, newsPage.page - 1),
                favoritesOnly,
                companyId: favoritesOnly ? undefined : companyId,
                category: favoritesOnly ? undefined : categoryFilter,
                dateFrom,
                dateTo,
              })}`}
              className={`rounded-full border px-5 py-2.5 text-base transition ${
                newsPage.page <= 1
                  ? "pointer-events-none border-white/15 text-white/40"
                  : "border-white/35 text-white hover:bg-white/10"
              }`}
            >
              Предыдущая
            </Link>
            <Link
              href={`/home${buildHomeNewsQuery({
                page: Math.min(newsPage.totalPages, newsPage.page + 1),
                favoritesOnly,
                companyId: favoritesOnly ? undefined : companyId,
                category: favoritesOnly ? undefined : categoryFilter,
                dateFrom,
                dateTo,
              })}`}
              className={`rounded-full border px-5 py-2.5 text-base transition ${
                newsPage.page >= newsPage.totalPages
                  ? "pointer-events-none border-white/15 text-white/40"
                  : "border-white/35 text-white hover:bg-white/10"
              }`}
            >
              Вперед
            </Link>
          </div>
        </div>
        </HomeScrollShell>
      </section>
    </main>
  );
}
