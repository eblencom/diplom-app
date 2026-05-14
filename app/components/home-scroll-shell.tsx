"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { NewsHomeFilters } from "@/app/components/news-home-filters";
import { TickerTape } from "@/app/components/ticker-tape";
import type { CategorySlug } from "@/lib/company-categories";

type Company = { id: number; name: string; ticker: string };

type Props = {
  companies: Company[];
  favoriteCompanyIds: number[];
  favoriteCategories: CategorySlug[];
  favoritesFilterActive: boolean;
  children: ReactNode;
};

const SCROLL_COMPACT_PX = 32;

export function HomeScrollShell({
  companies,
  favoriteCompanyIds,
  favoriteCategories,
  favoritesFilterActive,
  children,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [stickyH, setStickyH] = useState(220);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  const measureSticky = useCallback(() => {
    const el = stickyRef.current;
    if (!el) {
      return;
    }
    setStickyH(Math.ceil(el.getBoundingClientRect().height));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_COMPACT_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    measureSticky();
  }, [measureSticky, scrolled]);

  useLayoutEffect(() => {
    const el = stickyRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => measureSticky());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureSticky]);

  return (
    <div
      className="min-w-0"
      style={{ ["--home-sticky-h" as string]: `${stickyH}px` } as CSSProperties}
    >
      <div
        ref={stickyRef}
        className={[
          "sticky top-0 z-30 -mx-4 mb-6 flex flex-col border-b border-white/10 bg-[#05021b]/93 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#05021b]/85",
          "pt-[max(0.25rem,env(safe-area-inset-top))] sm:-mx-6 sm:px-6",
          "transition-[gap,padding-bottom] duration-500 ease-in-out motion-reduce:transition-none",
          scrolled ? "gap-1.5 pb-2.5" : "gap-2.5 pb-4",
        ].join(" ")}
      >
        <TickerTape className="!mb-0" />

        <div
          className={[
            "overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out motion-reduce:transition-none",
            scrolled ? "pointer-events-none max-h-0 opacity-0" : "max-h-[12rem] opacity-100",
          ].join(" ")}
          aria-hidden={scrolled}
        >
          <h1 className="text-2xl font-semibold leading-snug sm:text-3xl md:text-4xl">
            Последние новости финансового мира
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="h-16 animate-pulse rounded-xl bg-white/5" aria-hidden />
          }
        >
          <NewsHomeFilters
            companies={companies}
            favoriteCompanyIds={favoriteCompanyIds}
            favoriteCategories={favoriteCategories}
            favoritesFilterActive={favoritesFilterActive}
            compact={scrolled}
          />
        </Suspense>
      </div>

      {children}
    </div>
  );
}
