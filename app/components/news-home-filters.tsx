"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CompanyLogo } from "@/app/components/company-logo";

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

function SelectArrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

function CompanyDropdown({
  companies,
  value,
  selectedCompany,
  favoriteCompanyIds,
  disabled,
  onChange,
}: {
  companies: Company[];
  value: string;
  selectedCompany?: Company;
  favoriteCompanyIds: Set<number>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const currentLabel = selectedCompany
    ? `${selectedCompany.name} (${selectedCompany.ticker})`
    : "Все компании";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className="flex min-h-[50px] w-full items-center gap-2 rounded-xl border border-white/20 bg-[#12082c] py-3 pl-3.5 pr-12 text-left text-base text-white outline-none transition focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedCompany ? (
          <CompanyLogo ticker={selectedCompany.ticker} name={selectedCompany.name} size={24} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/55">
          <SelectArrow />
        </span>
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-[#12082c] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => {
              setOpen(false);
              onChange("");
            }}
            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-base transition ${
              value === "" ? "bg-cyan-500/15 text-cyan-100" : "text-white/80 hover:bg-white/8"
            }`}
          >
            Все компании
          </button>
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={value === String(c.id)}
              onClick={() => {
                setOpen(false);
                onChange(String(c.id));
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base transition ${
                value === String(c.id)
                  ? "bg-cyan-500/15 text-cyan-100"
                  : "text-white/80 hover:bg-white/8"
              }`}
            >
              <CompanyLogo ticker={c.ticker} name={c.name} size={24} />
              <span className="min-w-0 flex-1 truncate">
                {c.name} ({c.ticker})
              </span>
              {favoriteCompanyIds.has(c.id) ? (
                <span className="shrink-0 text-amber-300" aria-hidden>
                  ★
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryDropdown({
  value,
  favoriteCategories,
  disabled,
  onChange,
}: {
  value: string;
  favoriteCategories: Set<CategorySlug>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedCategory = isCategorySlugValue(value) ? value : undefined;
  const currentLabel = selectedCategory ? CATEGORY_LABELS[selectedCategory] : "Все категории";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className="flex min-h-[50px] w-full items-center gap-2 rounded-xl border border-white/20 bg-[#12082c] py-3 pl-3.5 pr-12 text-left text-base text-white outline-none transition focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/55">
          <SelectArrow />
        </span>
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-[#12082c] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            role="option"
            aria-selected={value === ""}
            onClick={() => {
              setOpen(false);
              onChange("");
            }}
            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-base transition ${
              value === "" ? "bg-violet-500/15 text-violet-100" : "text-white/80 hover:bg-white/8"
            }`}
          >
            Все категории
          </button>
          {(CATEGORY_ORDER as readonly CategorySlug[]).map((slug) => (
            <button
              key={slug}
              type="button"
              role="option"
              aria-selected={value === slug}
              onClick={() => {
                setOpen(false);
                onChange(slug);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base transition ${
                value === slug
                  ? "bg-violet-500/15 text-violet-100"
                  : "text-white/80 hover:bg-white/8"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{CATEGORY_LABELS[slug]}</span>
              {favoriteCategories.has(slug) ? (
                <span className="shrink-0 text-amber-300" aria-hidden>
                  ★
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isCategorySlugValue(value: string): value is CategorySlug {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
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
  const selectedCompany =
    companyValue !== "" ? companies.find((c) => String(c.id) === companyValue) : undefined;
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
    <div className="mt-7 flex flex-col gap-5 rounded-2xl border border-white/12 bg-gradient-to-r from-violet-950/35 via-[#0c0828]/80 to-cyan-950/25 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFavoritesView()}
            disabled={pending}
            className={`rounded-full border px-5 py-2.5 text-base font-medium transition disabled:opacity-50 ${
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
              <span className="ml-1.5 text-sm font-normal text-white/55">({favTotal})</span>
            ) : null}
          </button>
          {favoritesFilterActive ? (
            <p className="text-sm text-amber-100/70 sm:max-w-lg">
              Новости по любой из избранных компаний или по тикерам из избранных категорий.
            </p>
          ) : (
            <p className="text-sm text-white/45 sm:max-w-lg">
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
            className="rounded-full border border-white/25 px-5 py-2.5 text-base text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:self-center"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 items-end gap-2 sm:min-w-[200px]">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-white/60">
            Компания
            <CompanyDropdown
              companies={companies}
              value={companyValue}
              selectedCompany={selectedCompany}
              favoriteCompanyIds={favCompanySet}
              onChange={onCompanyChange}
              disabled={pending || favoritesFilterActive}
            />
            {selectedCompany ? (
              <span className="mt-1.5 inline-flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-sm text-white/75">
                <CompanyLogo ticker={selectedCompany.ticker} name={selectedCompany.name} size={20} />
                <span className="truncate">
                  {selectedCompany.name} ({selectedCompany.ticker})
                </span>
              </span>
            ) : null}
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
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-white/60">
            Категория
            <CategoryDropdown
              value={categoryValue}
              favoriteCategories={favCategorySet}
              onChange={onCategoryChange}
              disabled={pending || favoritesFilterActive}
            />
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
