"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CompanyLogo } from "@/app/components/company-logo";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategorySlug,
} from "@/lib/company-categories";
import { formatDdMmYyyyTyping, isoDateToDdMmYyyy, parseDdMmYyyyToIso, validateNewsDateParam } from "@/lib/news-date-param";

type Company = { id: number; name: string; ticker: string };

type Props = {
  companies: Company[];
  favoriteCompanyIds: number[];
  favoriteCategories: CategorySlug[];
  favoritesFilterActive: boolean;
  compact?: boolean;
};

function pushFilteredHome(
  router: ReturnType<typeof useRouter>,
  base: URLSearchParams,
  patch: {
    company?: string;
    category?: string;
    favorites?: "only" | "off";
    from?: string;
    to?: string;
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
  if (patch.from !== undefined) {
    if (patch.from === "") {
      next.delete("from");
    } else {
      next.set("from", patch.from);
    }
  }
  if (patch.to !== undefined) {
    if (patch.to === "") {
      next.delete("to");
    } else {
      next.set("to", patch.to);
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
  compact,
  onChange,
}: {
  companies: Company[];
  value: string;
  selectedCompany?: Company;
  favoriteCompanyIds: Set<number>;
  disabled: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setFilter("");
      return;
    }
    setFilter("");
    const id = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

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

  const q = filter.trim().toLowerCase();
  const filteredCompanies =
    q === ""
      ? companies
      : companies.filter(
          (c) => c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q),
        );

  const currentLabel = selectedCompany
    ? `${selectedCompany.name} (${selectedCompany.ticker})`
    : "Все компании";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`flex w-full items-center gap-2 rounded-lg border border-white/20 bg-[#12082c] text-left text-white outline-none transition-[min-height,padding,font-size,border-radius] duration-500 ease-in-out focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
          compact
            ? "min-h-[34px] py-1.5 pl-2 pr-9 text-xs"
            : "min-h-[44px] py-2 pl-2.5 pr-10 text-sm"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedCompany ? (
          <CompanyLogo ticker={selectedCompany.ticker} name={selectedCompany.name} size={compact ? 18 : 22} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55 sm:right-4">
          <SelectArrow />
        </span>
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-[#12082c] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <input
            ref={searchRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Поиск: название или тикер"
            autoComplete="off"
            aria-label="Поиск компании"
            className={
              compact
                ? "mb-1.5 w-full rounded-lg border border-white/18 bg-black/35 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-cyan-500/45"
                : "mb-2 w-full rounded-lg border border-white/18 bg-black/35 px-2.5 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-cyan-500/40"
            }
          />
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
          {filteredCompanies.length === 0 ? (
            <p className="px-3 py-2 text-sm text-white/50">Ничего не найдено</p>
          ) : (
            filteredCompanies.map((c) => (
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
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function CategoryDropdown({
  value,
  favoriteCategories,
  disabled,
  compact,
  onChange,
}: {
  value: string;
  favoriteCategories: Set<CategorySlug>;
  disabled: boolean;
  compact?: boolean;
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
        className={`flex w-full items-center gap-2 rounded-lg border border-white/20 bg-[#12082c] text-left text-white outline-none transition-[min-height,padding,font-size,border-radius] duration-500 ease-in-out focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
          compact
            ? "min-h-[34px] py-1.5 pl-2 pr-9 text-xs"
            : "min-h-[44px] py-2 pl-2.5 pr-10 text-sm"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55 sm:right-4">
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
  compact = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [starBusy, setStarBusy] = useState(false);

  const companyValue = searchParams.get("company") ?? "";
  const categoryValue = searchParams.get("category") ?? "";
  const fromValue = searchParams.get("from") ?? "";
  const toValue = searchParams.get("to") ?? "";

  const [fromInput, setFromInput] = useState(() =>
    isoDateToDdMmYyyy(validateNewsDateParam(fromValue)),
  );
  const [toInput, setToInput] = useState(() => isoDateToDdMmYyyy(validateNewsDateParam(toValue)));

  useEffect(() => {
    setFromInput(isoDateToDdMmYyyy(validateNewsDateParam(fromValue)));
  }, [fromValue]);

  useEffect(() => {
    setToInput(isoDateToDdMmYyyy(validateNewsDateParam(toValue)));
  }, [toValue]);

  const commitFromBlur = useCallback(() => {
    const trimmed = fromInput.trim();
    if (trimmed === "") {
      if (validateNewsDateParam(fromValue)) {
        startTransition(() => {
          pushFilteredHome(router, searchParams, { from: "" });
        });
      }
      return;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setFromInput(isoDateToDdMmYyyy(validateNewsDateParam(fromValue)));
      return;
    }
    if (iso === validateNewsDateParam(fromValue)) {
      setFromInput(isoDateToDdMmYyyy(iso));
      return;
    }
    startTransition(() => {
      pushFilteredHome(router, searchParams, { from: iso });
    });
  }, [fromInput, fromValue, router, searchParams]);

  const commitToBlur = useCallback(() => {
    const trimmed = toInput.trim();
    if (trimmed === "") {
      if (validateNewsDateParam(toValue)) {
        startTransition(() => {
          pushFilteredHome(router, searchParams, { to: "" });
        });
      }
      return;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setToInput(isoDateToDdMmYyyy(validateNewsDateParam(toValue)));
      return;
    }
    if (iso === validateNewsDateParam(toValue)) {
      setToInput(isoDateToDdMmYyyy(iso));
      return;
    }
    startTransition(() => {
      pushFilteredHome(router, searchParams, { to: iso });
    });
  }, [toInput, toValue, router, searchParams]);

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
      pushFilteredHome(router, searchParams, {
        company: "",
        category: "",
        favorites: "off",
        from: "",
        to: "",
      });
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
    companyValue ||
    categoryValue ||
    fromValue ||
    toValue ||
    favoritesFilterActive ||
    favTotal > 0;

  return (
    <div
      className={
        compact
          ? "mt-0 flex flex-col gap-1.5 rounded-lg border border-white/12 bg-gradient-to-r from-violet-950/35 via-[#0c0828]/80 to-cyan-950/25 p-2 transition-[padding,gap,border-radius] duration-500 ease-in-out motion-reduce:transition-none"
          : "mt-0 flex flex-col gap-3 rounded-xl border border-white/12 bg-gradient-to-r from-violet-950/35 via-[#0c0828]/80 to-cyan-950/25 p-3.5 transition-[padding,gap,border-radius] duration-500 ease-in-out motion-reduce:transition-none"
      }
    >
      <div
        className={
          compact
            ? "flex flex-col gap-1.5 transition-[gap] duration-500 ease-in-out sm:flex-row sm:flex-wrap sm:items-center sm:justify-between motion-reduce:transition-none"
            : "flex flex-col gap-2 transition-[gap] duration-500 ease-in-out sm:flex-row sm:flex-wrap sm:items-center sm:justify-between motion-reduce:transition-none"
        }
      >
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => toggleFavoritesView()}
            disabled={pending}
            className={`rounded-full border font-medium transition-[padding,font-size] duration-500 ease-in-out disabled:opacity-50 motion-reduce:transition-none ${
              compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
            } ${
              favoritesFilterActive
                ? "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                : "border-white/25 text-white/85 hover:bg-white/10"
            }`}
          >
            <span className="mr-1 inline-block align-middle text-amber-300" aria-hidden>
              ★
            </span>
            Только избранное
            {favTotal > 0 ? (
              <span
                className={
                  compact
                    ? "ml-0.5 text-[10px] font-normal text-white/55"
                    : "ml-1 text-xs font-normal text-white/55"
                }
              >
                ({favTotal})
              </span>
            ) : null}
          </button>
          {!compact && favoritesFilterActive ? (
            <p className="max-w-lg text-xs text-amber-100/70 sm:text-sm">
              Новости по любой из избранных компаний или по ценам из избранных категорий.
            </p>
          ) : null}
          {!compact && !favoritesFilterActive ? (
            <p className="max-w-lg text-xs text-white/45 sm:text-sm">
              Звёздочкой добавьте текущую компанию или категорию в избранное, затем включите режим
              «Только избранное».
            </p>
          ) : null}
        </div>
        {showReset ? (
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className={`rounded-full border border-white/25 text-white/85 transition-[padding,font-size] duration-500 ease-in-out hover:bg-white/10 disabled:opacity-50 sm:self-center motion-reduce:transition-none ${
              compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
            }`}
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <div
        className={
          compact
            ? "grid w-full grid-cols-4 gap-1.5 sm:gap-2"
            : "grid w-full grid-cols-4 gap-2 sm:gap-3"
        }
      >
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/12 bg-black/25 p-2 sm:min-h-0">
          <span
            className={
              compact ? "text-[10px] font-medium text-white/55" : "text-xs font-medium text-white/60"
            }
          >
            Компания
          </span>
          <div className="flex min-w-0 items-end gap-1.5">
            <div className="min-w-0 flex-1">
              <CompanyDropdown
                companies={companies}
                value={companyValue}
                selectedCompany={selectedCompany}
                favoriteCompanyIds={favCompanySet}
                compact={compact}
                onChange={onCompanyChange}
                disabled={pending || favoritesFilterActive}
              />
            </div>
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
              className={`flex shrink-0 items-center justify-center rounded-lg border transition-[width,height,padding] duration-500 ease-in-out disabled:opacity-40 motion-reduce:transition-none ${
                compact ? "size-8" : "size-9"
              } ${
                companyFav
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                  : "border-white/20 bg-black/30 text-white/40 hover:border-amber-400/35 hover:text-amber-200/90"
              }`}
            >
              <StarIcon filled={companyFav} />
            </button>
          </div>
          {selectedCompany && !compact ? (
            <span className="mt-0.5 inline-flex min-w-0 items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-white/75 sm:text-xs">
              <CompanyLogo ticker={selectedCompany.ticker} name={selectedCompany.name} size={16} />
              <span className="truncate">
                {selectedCompany.name} ({selectedCompany.ticker})
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/12 bg-black/25 p-2 sm:min-h-0">
          <span
            className={
              compact ? "text-[10px] font-medium text-white/55" : "text-xs font-medium text-white/60"
            }
          >
            Категория
          </span>
          <div className="flex min-w-0 items-end gap-1.5">
            <div className="min-w-0 flex-1">
              <CategoryDropdown
                value={categoryValue}
                favoriteCategories={favCategorySet}
                compact={compact}
                onChange={onCategoryChange}
                disabled={pending || favoritesFilterActive}
              />
            </div>
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
              className={`flex shrink-0 items-center justify-center rounded-lg border transition-[width,height,padding] duration-500 ease-in-out disabled:opacity-40 motion-reduce:transition-none ${
                compact ? "size-8" : "size-9"
              } ${
                categoryFav
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                  : "border-white/20 bg-black/30 text-white/40 hover:border-amber-400/35 hover:text-amber-200/90"
              }`}
            >
              <StarIcon filled={categoryFav} />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/12 bg-black/25 p-2 sm:min-h-0">
          <span
            className={
              compact
                ? "text-[10px] font-medium uppercase tracking-wide text-white/55"
                : "text-xs font-medium uppercase tracking-wide text-white/60"
            }
          >
            Дата с
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="дд/мм/гггг"
            title="Формат дд/мм/гггг, применение по Tab или Enter"
            value={fromInput}
            onChange={(e) => setFromInput(formatDdMmYyyyTyping(e.target.value))}
            onBlur={() => commitFromBlur()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={pending}
            className={
              compact
                ? "w-full min-w-0 rounded-md border border-white/20 bg-[#12082c] px-1.5 py-1 text-center text-[11px] font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-cyan-500/45 disabled:opacity-50"
                : "w-full min-w-0 rounded-md border border-white/20 bg-[#12082c] px-2 py-1.5 text-center text-sm font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/12 bg-black/25 p-2 sm:min-h-0">
          <span
            className={
              compact
                ? "text-[10px] font-medium uppercase tracking-wide text-white/55"
                : "text-xs font-medium uppercase tracking-wide text-white/60"
            }
          >
            Дата по
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="дд/мм/гггг"
            title="Формат дд/мм/гггг, применение по Tab или Enter"
            value={toInput}
            onChange={(e) => setToInput(formatDdMmYyyyTyping(e.target.value))}
            onBlur={() => commitToBlur()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={pending}
            className={
              compact
                ? "w-full min-w-0 rounded-md border border-white/20 bg-[#12082c] px-1.5 py-1 text-center text-[11px] font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-cyan-500/45 disabled:opacity-50"
                : "w-full min-w-0 rounded-md border border-white/20 bg-[#12082c] px-2 py-1.5 text-center text-sm font-mono tabular-nums tracking-tight text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
            }
          />
        </div>
      </div>
    </div>
  );
}
