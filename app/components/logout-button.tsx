"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full border border-rose-500/70 bg-rose-600/90 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-500 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {pending ? "Выход..." : "Выйти"}
    </button>
  );
}
