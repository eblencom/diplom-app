"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Боковая колонка: липкая под высоту верхней полосы (--home-sticky-h задаёт HomeScrollShell). */
export function HomeWinrateAside({ children }: Props) {
  return (
    <div className="lg:sticky lg:self-start lg:top-[calc(var(--home-sticky-h,220px)+0.5rem)]">
      {children}
    </div>
  );
}
