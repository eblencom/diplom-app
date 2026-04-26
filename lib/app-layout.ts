/** Общая максимальная ширина контента (100% вместо 100vw — иначе появляется гориз. скролл и полоса справа). min-w-0 — чтобы flex-дети не раздували страницу по горизонтали. */
export const APP_CONTENT_MAX_CLASS =
  "mx-auto w-full min-w-0 max-w-[min(1680px,100%)]";

/** Узкая колонка для футера — блок ближе к центру экрана. */
export const FOOTER_INNER_CLASS =
  "mx-auto w-full max-w-2xl px-4 sm:max-w-3xl sm:px-8";
