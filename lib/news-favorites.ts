import "server-only";

import type { CategorySlug } from "@/lib/company-categories";
import {
  getFavoritesWhereSql as getFavoritesWhereSqlImpl,
  getNewsFavoriteCategorySlugs,
  getNewsFavoriteCompanyIds,
  toggleNewsFavoriteCategory as toggleNewsFavoriteCategoryImpl,
  toggleNewsFavoriteCompany as toggleNewsFavoriteCompanyImpl,
} from "@/lib/user-preference-items";

export async function getUserNewsFavoriteCompanyIds(userId: number): Promise<number[]> {
  return getNewsFavoriteCompanyIds(userId);
}

export async function getUserNewsFavoriteCategorySlugs(userId: number): Promise<CategorySlug[]> {
  return getNewsFavoriteCategorySlugs(userId);
}

export async function getFavoritesWhereSql(userId: number): Promise<{
  clause: string;
  params: unknown[];
  nextIndex: number;
}> {
  return getFavoritesWhereSqlImpl(userId);
}

export async function toggleNewsFavoriteCompany(
  userId: number,
  companyId: number,
): Promise<{ favorited: boolean }> {
  return toggleNewsFavoriteCompanyImpl(userId, companyId);
}

export async function toggleNewsFavoriteCategory(
  userId: number,
  categorySlug: string,
): Promise<{ favorited: boolean }> {
  return toggleNewsFavoriteCategoryImpl(userId, categorySlug);
}
