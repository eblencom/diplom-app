"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyLogo } from "@/app/components/company-logo";
import { CATEGORY_LABELS, CATEGORY_ORDER, type CategorySlug } from "@/lib/company-categories";

type AdminCompanyRow = {
  id: number;
  name: string;
  ticker: string;
  newsLink: string | null;
  priceLink: string | null;
  pricesPath: string | null;
  logoPath: string | null;
  categorySlugs: CategorySlug[];
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#12082c] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-500/25 disabled:opacity-50";

export function AdminCompaniesPanel() {
  const [companies, setCompanies] = useState<AdminCompanyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [listPending, setListPending] = useState(true);
  const [submitPending, setSubmitPending] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategorySlug>>(new Set());
  const [logoFileName, setLogoFileName] = useState("");

  const load = useCallback(async () => {
    setError(null);
    setListPending(true);
    try {
      const res = await fetch("/api/admin/companies", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { companies?: AdminCompanyRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось загрузить компании");
        setCompanies(null);
        return;
      }
      setCompanies(data.companies ?? []);
    } catch {
      setError("Сеть недоступна.");
      setCompanies(null);
    } finally {
      setListPending(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => CATEGORY_ORDER.map((slug) => ({ slug, label: CATEGORY_LABELS[slug] })),
    [],
  );

  const toggleCategory = (slug: CategorySlug) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitPending(true);

    const form = new FormData(event.currentTarget);
    form.delete("categorySlugs");
    for (const slug of selectedCategories) {
      form.append("categorySlugs", slug);
    }

    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as { company?: AdminCompanyRow; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось добавить компанию");
        return;
      }
      event.currentTarget.reset();
      setSelectedCategories(new Set());
      setLogoFileName("");
      setSuccess(`Компания «${data.company?.name ?? "новая"}» добавлена.`);
      await load();
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setSubmitPending(false);
    }
  };

  const deleteCompany = async (company: AdminCompanyRow) => {
    const confirmed = window.confirm(
      `Удалить компанию «${company.name}»? Связанные новости и прогнозы также будут удалены.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeletePendingId(company.id);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить компанию");
        return;
      }
      setSuccess(`Компания «${company.name}» удалена.`);
      await load();
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setDeletePendingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/12 bg-[#0c0824]/70 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Компании</h2>
          <p className="mt-1 text-sm text-white/55">
            Добавление компаний для ленты новостей, фильтров, графиков и Telegram-уведомлений.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={listPending || submitPending}
          className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
        >
          Обновить
        </button>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">Название</span>
            <input name="name" required minLength={2} maxLength={255} placeholder="Например, Яндекс" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">Код цены</span>
            <input name="ticker" required minLength={2} maxLength={32} placeholder="YNDX" className={`${inputClass} font-mono uppercase`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">Ссылка на новости</span>
            <input name="newsLink" type="url" placeholder="https://..." className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">Ссылка на цену</span>
            <input name="priceLink" type="url" placeholder="https://..." className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-white/55">Логотип</span>
            <span className="flex items-center gap-3 rounded-lg border border-dashed border-white/20 bg-[#12082c] px-3 py-2">
              <span className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950">
                Выбрать файл
              </span>
              <span className="min-w-0 truncate text-sm text-white/65">
                {logoFileName || "Файл не выбран"}
              </span>
            </span>
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => setLogoFileName(e.target.files?.[0]?.name ?? "")}
              className="sr-only"
            />
            <span className="text-xs text-white/35">PNG, JPG, WebP или SVG до 2 МБ</span>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/55">Категории</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const checked = selectedCategories.has(cat.slug);
              return (
                <button
                  type="button"
                  key={cat.slug}
                  onClick={() => toggleCategory(cat.slug)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    checked
                      ? "border-cyan-300/70 bg-cyan-300/20 text-cyan-50"
                      : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm">
            {error ? <span className="text-rose-300/90">{error}</span> : null}
            {success ? <span className="text-emerald-300/90">{success}</span> : null}
          </div>
          <button
            type="submit"
            disabled={submitPending}
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {submitPending ? "Сохраняем…" : "Добавить компанию"}
          </button>
        </div>
      </form>

      {listPending && !companies ? (
        <div className="mt-6 h-32 animate-pulse rounded-xl bg-white/5" aria-hidden />
      ) : null}

      {companies && companies.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[1020px] border-collapse text-left text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06] text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-medium">Компания</th>
                <th className="px-4 py-3 font-medium">Цены</th>
                <th className="px-4 py-3 font-medium">Категории</th>
                <th className="px-4 py-3 font-medium">Файл цен</th>
                <th className="px-4 py-3 font-medium">Ссылки</th>
                <th className="px-4 py-3 font-medium">Удаление</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CompanyLogo ticker={company.ticker} name={company.name} size={28} />
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-cyan-100">{company.ticker}</td>
                  <td className="px-4 py-3">
                    {company.categorySlugs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {company.categorySlugs.map((slug) => (
                          <span key={slug} className="rounded-full border border-white/15 px-2 py-1 text-xs text-white/70">
                            {CATEGORY_LABELS[slug]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/35">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">{company.pricesPath ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/65">
                    <div className="flex flex-col gap-1">
                      {company.newsLink ? (
                        <a
                          className="hover:text-cyan-200"
                          href={company.newsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Новости
                        </a>
                      ) : null}
                      {company.priceLink ? (
                        <a
                          className="hover:text-cyan-200"
                          href={company.priceLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Цена
                        </a>
                      ) : null}
                      {!company.newsLink && !company.priceLink ? <span className="text-white/35">—</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={deletePendingId === company.id || submitPending}
                      onClick={() => void deleteCompany(company)}
                      className="rounded-full border border-red-400/45 bg-red-900/35 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-900/55 disabled:opacity-50"
                    >
                      {deletePendingId === company.id ? "…" : "Удалить"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
