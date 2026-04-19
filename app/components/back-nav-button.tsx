"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
};

export function BackNavButton({ className }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:border-white/45 hover:bg-white/10 ${className ?? ""}`}
    >
      ← Назад
    </button>
  );
}
