"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategorySlug,
} from "@/lib/company-categories";

type Company = { id: number; name: string; ticker: string };

type Props = {
  companies: Company[];
  favoriteCompanyIds: number[];
  favoriteCategories: CategorySlug[];
  favoritesFilterActive: boolean;
};

function pushFilteredHome(
  router: ReturnType<typeof useRouter>,
  base: URLSearchParams,
  patch: {
    company?: string;
    category?: string;
    favorites?: "only" | "off";
    resetPage?: boolean;
  },
) {
  const next = new URLSearchParams(base.toString());
  if (patch.resetPage !== false) {
    next.set("page", "1");
  }
  if (patch.favorites === "only") {
    next.delete("company");
    next.delete("category");
    next.set("favorites", "1");
  }
  if (patch.favorites === "off") {
    next.delete("favorites");
  }
  if (patch.company !== undefined) {
    next.delete("favorites");
    if (patch.company === "") {
      next.delete("company");
    } else {
      next.set("company", patch.company);
    }
  }
  if (patch.category !== undefined) {
    next.delete("favorites");
    if (patch.category === "") {
      next.delete("category");
    } else {
      next.set("category", patch.category);
    }
  }
  const q = next.toString();
  router.push(q ? `/home?${q}` : "/home");
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      className="inline-block"
      aria-hidden
    >
      <path d="M12 3.5l2.35 5.45 5.9.52-4.47 3.88 1.34 5.75L12 16.9l-5.12 3.2 1.34-5.75-4.47-3.88 5.9-.52L12 3.5z" />
    </svg>
  );
}

export function NewsHomeFilters({
  companies,
  favoriteCompanyIds,
  favoriteCategories,
  favoritesFilterActive,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [starBusy, setStarBusy] = useState(false);

  const companyValue = searchParams.get("company") ?? "";
  const categoryValue = searchParams.get("category") ?? "";

  const favCompanySet = new Set(favoriteCompanyIds);
  const favCategorySet = new Set(favoriteCategories);
  const favTotal = favoriteCompanyIds.length + favoriteCategories.length;

  const companyFav = companyValue !== "" && favCompanySet.has(Number(companyValue));
  const categoryFav =
    categoryValue !== "" && favCategorySet.has(categoryValue as CategorySlug);

  const onCompanyChange = useCallback(
    (value: string) => {
      startTransition(() => {
        if (value !== "") {
          pushFilteredHome(router, searchParams, { company: value, category: "" });
        } else {
          pushFilteredHome(router, searchParams, { company: "" });
        }
      });
    },
    [router, searchParams],
  );

  const onCategoryChange = useCallback(
    (value: string) => {
      startTransition(() => {
        if (value !== "") {
          pushFilteredHome(router, searchParams, { company: "", category: value });
        } else {
          pushFilteredHome(router, searchParams, { category: "" });
        }
      });
    },
    [router, searchParams],
  );

  const onReset = useCallback(() => {
    startTransition(() => {
      pushFilteredHome(router, searchParams, { company: "", category: "", favorites: "off" });
    });
  }, [router, searchParams]);

  const toggleFavoritesView = useCallback(() => {
    startTransition(() => {
      if (favoritesFilterActive) {
        pushFilteredHome(router, searchParams, { favorites: "off" });
      } else {
        pushFilteredHome(router, searchParams, { favorites: "only" });
      }
    });
  }, [router, searchParams, favoritesFilterActive]);

  const toggleCompanyStar = useCallback(async () => {
    if (!companyValue) {
      return;
    }
    const id = Number(companyValue);
    if (!Number.isFinite(id) || id < 1) {
      return;
    }
    setStarBusy(true);
    try {
      const res = await fetch("/api/profile/news-favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId: id }),
      });
      if (!res.ok) {
        return;
      }
      router.refresh();
    } finally {
      setStarBusy(false);
    }
  }, [companyValue, router]);

  const toggleCategoryStar = useCallback(async () => {
    if (!categoryValue) {
      return;
    }
    setStarBusy(true);
    try {
      const res = await fetch("/api/profile/news-favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category: categoryValue }),
      });
      if (!res.ok) {
        return;
      }
      router.refresh();
    } finally {
      setStarBusy(false);
    }
  }, [categoryValue, router]);

  const showReset =
    companyValue || categoryValue || favoritesFilterActive || favTotal > 0;

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/12 bg-gradient-to-r from-violet-950/35 via-[#0c0828]/80 to-cyan-950/25 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFavoritesView()}
            disabled={pending}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
              favoritesFilterActive
                ? "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                : "border-white/25 text-white/85 hover:bg-white/10"
            }`}
          >
            <span className="mr-1.5 inline-block align-middle text-amber-300" aria-hidden>
              ★
            </span>
            Только избранное
            {favTotal > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-white/55">({favTotal})</span>
            ) : null}
          </button>
          {favoritesFilterActive ? (
            <p className="text-xs text-amber-100/70 sm:max-w-md">
              Новости по любой из избранных компаний или по тикерам из избранных категорий.
            </p>
          ) : (
            <p className="text-xs text-white/45 sm:max-w-md">
              Звёздочкой добавьте текущую компанию или категорию в избранное, затем включите режим
              «Только избранное».
            </p>
          )}
        </div>
        {showReset ? (
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:self-center"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 items-end gap-2 sm:min-w-[200px]">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-white/60">
            Компания
            <select
              value={companyValue}
              onChange={(e) => onCompanyChange(e.target.value)}
              disabled={pending || favoritesFilterActive}
              className="rounded-xl border border-white/20 bg-[#12082c] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Все компании</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {favCompanySet.has(c.id) ? "★ " : ""}
                  {c.name} ({c.ticker})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            title={
              companyValue
                ? companyFav
                  ? "Убрать компанию из избранного"
                  : "Добавить компанию в избранное"
                : "Выберите компанию в списке"
            }
            disabled={pending || starBusy || !companyValue || favoritesFilterActive}
            onClick={() => void toggleCompanyStar()}
            className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40 ${
              companyFav
                ? "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                : "border-white/20 bg-black/30 text-white/40 hover:border-amber-400/35 hover:text-amber-200/90"
            }`}
          >
            <StarIcon filled={companyFav} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-end gap-2 sm:min-w-[200px]">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-white/60">
            Категория
            <select
              value={categoryValue}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={pending || favoritesFilterActive}
              className="rounded-xl border border-white/20 bg-[#12082c] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Все категории</option>
              {(CATEGORY_ORDER as readonly CategorySlug[]).map((slug) => (
                <option key={slug} value={slug}>
                  {favCategorySet.has(slug) ? "★ " : ""}
                  {CATEGORY_LABELS[slug]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            title={
              categoryValue
                ? categoryFav
                  ? "Убрать категорию из избранного"
                  : "Добавить категорию в избранное"
                : "Выберите категорию в списке"
            }
            disabled={pending || starBusy || !categoryValue || favoritesFilterActive}
            onClick={() => void toggleCategoryStar()}
            className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40 ${
              categoryFav
                ? "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                : "border-white/20 bg-black/30 text-white/40 hover:border-amber-400/35 hover:text-amber-200/90"
            }`}
          >
            <StarIcon filled={categoryFav} />
          </button>
        </div>
      </div>
    </div>
  );
}
