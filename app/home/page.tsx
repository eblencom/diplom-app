import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/app-header";
import { NewsHomeFilters } from "@/app/components/news-home-filters";
import { TickerTape } from "@/app/components/ticker-tape";
import { NewsPredictPanel } from "@/app/components/news-predict-panel";
import { NewsPriceBefore } from "@/app/components/news-price-before";
import { TickerTradingViewLink } from "@/app/components/ticker-tradingview-link";
import { UserWinrateCard } from "@/app/components/user-winrate-card";
import { APP_CONTENT_MAX_CLASS } from "@/lib/app-layout";
import { categoryLabelsForTicker, isCategorySlug } from "@/lib/company-categories";
import { buildHomeNewsQuery } from "@/lib/home-news-query";
import {
  getUserNewsFavoriteCategorySlugs,
  getUserNewsFavoriteCompanyIds,
} from "@/lib/news-favorites";
import { getCompaniesForNewsFilter, getNewsPage } from "@/lib/news";
import { getCurrentSession } from "@/lib/session";
import { startNewsParserScheduler } from "@/lib/news-parser-scheduler";
import { getUserWinrateStats } from "@/lib/user-winrate";

type HomePageProps = {
  searchParams: Promise<{
    page?: string;
    company?: string;
    category?: string;
    favorites?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
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

  const listFilters = favoritesOnly
    ? { favoritesOnly: true as const }
    : companyId != null || categoryFilter != null
      ? {
          ...(companyId != null ? { companyId } : {}),
          ...(categoryFilter != null ? { category: categoryFilter } : {}),
        }
      : undefined;

  const [newsPage, companies, winrateInitial, favoriteCompanyIds, favoriteCategories] =
    await Promise.all([
      getNewsPage(currentPage, 10, session.userId, listFilters),
      getCompaniesForNewsFilter(),
      getUserWinrateStats(session.userId),
      getUserNewsFavoriteCompanyIds(session.userId),
      getUserNewsFavoriteCategorySlugs(session.userId),
    ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#05021b] px-4 py-8 text-white sm:px-6">
      <section className={APP_CONTENT_MAX_CLASS}>
        <AppHeader login={session.login} role={session.role} />

        <TickerTape />

        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-8 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">Главная страница приложения</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Новости обновляются парсером автоматически каждую минуту (тестовый
            режим).
          </p>

          <Suspense
            fallback={
              <div className="mt-6 h-24 animate-pulse rounded-2xl bg-white/5" aria-hidden />
            }
          >
            <NewsHomeFilters
              companies={companies}
              favoriteCompanyIds={favoriteCompanyIds}
              favoriteCategories={favoriteCategories}
              favoritesFilterActive={favoritesOnly}
            />
          </Suspense>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
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
                className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#10082c]/95 via-[#0a061f]/90 to-black/50 p-6 shadow-[0_12px_48px_rgba(34,211,238,0.06)]"
              >
                {(() => {
                  const paragraphs = splitParagraphs(item.text);
                  const firstParagraph = paragraphs[0] ?? item.text;
                  const restParagraphs = paragraphs.slice(1);
                  const categoryTags = categoryLabelsForTicker(item.ticker);

                  return (
                    <>
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm text-white/65">{item.companyName}</div>
                          <div className="mt-1 text-xs text-white/60">{formatDate(item.datetime)}</div>
                          {categoryTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {categoryTags.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-100/90"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:max-w-[520px] sm:items-end sm:text-right">
                          <div className="text-sm font-semibold text-white/90 sm:self-end">{item.ticker}</div>
                          <NewsPriceBefore newsId={item.id} />
                          <TickerTradingViewLink ticker={item.ticker} />
                        </div>
                      </div>

                      <NewsPredictPanel newsId={item.id} initialPredicts={item.predicts} />

                      <p className="text-white/90">{firstParagraph}</p>

                      {restParagraphs.length > 0 && (
                        <details className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                          <summary className="cursor-pointer text-sm text-white/80 hover:text-white">
                            Подробнее
                          </summary>
                          <div className="mt-3 space-y-3">
                            {restParagraphs.map((paragraph, idx) => (
                              <p key={`${item.id}-${idx}`} className="text-white/80">
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

            <div className="lg:sticky lg:top-6">
              <UserWinrateCard initial={winrateInitial} />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-white/65">
              Страница {newsPage.page} из {newsPage.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/home${buildHomeNewsQuery({
                  page: Math.max(1, newsPage.page - 1),
                  favoritesOnly,
                  companyId: favoritesOnly ? undefined : companyId,
                  category: favoritesOnly ? undefined : categoryFilter,
                })}`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  newsPage.page <= 1
                    ? "pointer-events-none border-white/15 text-white/40"
                    : "border-white/35 text-white hover:bg-white/10"
                }`}
              >
                Назад
              </Link>
              <Link
                href={`/home${buildHomeNewsQuery({
                  page: Math.min(newsPage.totalPages, newsPage.page + 1),
                  favoritesOnly,
                  companyId: favoritesOnly ? undefined : companyId,
                  category: favoritesOnly ? undefined : categoryFilter,
                })}`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  newsPage.page >= newsPage.totalPages
                    ? "pointer-events-none border-white/15 text-white/40"
                    : "border-white/35 text-white hover:bg-white/10"
                }`}
              >
                Вперед
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
