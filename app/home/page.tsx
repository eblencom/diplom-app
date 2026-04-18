import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/app-header";
import { NewsPredictPanel } from "@/app/components/news-predict-panel";
import { NewsPriceBefore } from "@/app/components/news-price-before";
import { TickerTradingViewLink } from "@/app/components/ticker-tradingview-link";
import { UserWinrateCard } from "@/app/components/user-winrate-card";
import { getCurrentSession } from "@/lib/session";
import { getNewsPage } from "@/lib/news";
import { startNewsParserScheduler } from "@/lib/news-parser-scheduler";
import { getUserWinrateStats } from "@/lib/user-winrate";

type HomePageProps = {
  searchParams: Promise<{
    page?: string;
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
  const newsPage = await getNewsPage(currentPage, 10, session.userId);
  const winrateInitial = await getUserWinrateStats(session.userId);

  return (
    <main className="min-h-screen bg-[#05021b] px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <AppHeader login={session.login} role={session.role} />

        <div className="rounded-3xl border border-white/15 bg-[#0f0a35]/65 p-8 shadow-[0_20px_80px_rgba(90,24,255,0.25)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">Главная страница приложения</h1>
          <p className="mt-3 max-w-3xl text-white/70">
            Новости обновляются парсером автоматически каждую минуту (тестовый
            режим).
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="space-y-4">
            {newsPage.items.length === 0 && (
              <div className="rounded-2xl border border-white/15 bg-black/20 p-5 text-white/70">
                Пока нет новостей. После первого прохода парсера новости появятся
                здесь.
              </div>
            )}

            {newsPage.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/15 bg-black/20 p-5">
                {(() => {
                  const paragraphs = splitParagraphs(item.text);
                  const firstParagraph = paragraphs[0] ?? item.text;
                  const restParagraphs = paragraphs.slice(1);

                  return (
                    <>
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm text-white/65">{item.companyName}</div>
                          <div className="mt-1 text-xs text-white/60">{formatDate(item.datetime)}</div>
                        </div>
                        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:max-w-[420px] sm:items-end sm:text-right">
                          <div className="text-sm font-semibold text-white/90 sm:self-end">{item.ticker}</div>
                          <NewsPriceBefore newsId={item.id} />
                          <TickerTradingViewLink ticker={item.ticker} />
                        </div>
                      </div>

                      <NewsPredictPanel newsId={item.id} initialPredict={item.predict} />

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
                href={`/home?page=${Math.max(1, newsPage.page - 1)}`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  newsPage.page <= 1
                    ? "pointer-events-none border-white/15 text-white/40"
                    : "border-white/35 text-white hover:bg-white/10"
                }`}
              >
                Назад
              </Link>
              <Link
                href={`/home?page=${Math.min(newsPage.totalPages, newsPage.page + 1)}`}
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
