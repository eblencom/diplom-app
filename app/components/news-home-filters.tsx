"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategorySlug,
} from "@/lib/company-categories";

type Company = { id: number; name: string; ticker: string };

type Props = {
  companies: Company[];
};

function pushFilteredHome(
  router: ReturnType<typeof useRouter>,
  base: URLSearchParams,
  patch: { company?: string; category?: string; resetPage?: boolean },
) {
  const next = new URLSearchParams(base.toString());
  if (patch.resetPage !== false) {
    next.set("page", "1");
  }
  if (patch.company !== undefined) {
    if (patch.company === "") {
      next.delete("company");
    } else {
      next.set("company", patch.company);
    }
  }
  if (patch.category !== undefined) {
    if (patch.category === "") {
      next.delete("category");
    } else {
      next.set("category", patch.category);
    }
  }
  const q = next.toString();
  router.push(q ? `/home?${q}` : "/home");
}

export function NewsHomeFilters({ companies }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const companyValue = searchParams.get("company") ?? "";
  const categoryValue = searchParams.get("category") ?? "";

  const onCompanyChange = useCallback(
    (value: string) => {
      startTransition(() => {
        pushFilteredHome(router, searchParams, { company: value });
      });
    },
    [router, searchParams],
  );

  const onCategoryChange = useCallback(
    (value: string) => {
      startTransition(() => {
        pushFilteredHome(router, searchParams, { category: value });
      });
    },
    [router, searchParams],
  );

  const onReset = useCallback(() => {
    startTransition(() => {
      pushFilteredHome(router, searchParams, { company: "", category: "" });
    });
  }, [router, searchParams]);

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/12 bg-gradient-to-r from-violet-950/35 via-[#0c0828]/80 to-cyan-950/25 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs text-white/60">
        Компания
        <select
          value={companyValue}
          onChange={(e) => onCompanyChange(e.target.value)}
          disabled={pending}
          className="rounded-xl border border-white/20 bg-[#12082c] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-60"
        >
          <option value="">Все компании</option>
          {companies.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name} ({c.ticker})
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs text-white/60">
        Категория
        <select
          value={categoryValue}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={pending}
          className="rounded-xl border border-white/20 bg-[#12082c] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60"
        >
          <option value="">Все категории</option>
          {(CATEGORY_ORDER as readonly CategorySlug[]).map((slug) => (
            <option key={slug} value={slug}>
              {CATEGORY_LABELS[slug]}
            </option>
          ))}
        </select>
      </label>

      {(companyValue || categoryValue) && (
        <button
          type="button"
          onClick={onReset}
          disabled={pending}
          className="rounded-full border border-white/25 px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:self-end"
        >
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}
