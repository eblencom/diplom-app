"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HomeChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.classList.add("home-scrollbar");
    return () => {
      document.documentElement.classList.remove("home-scrollbar");
    };
  }, []);

  useEffect(() => {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entries[0]?.type !== "reload") {
      return;
    }
    const sp = new URLSearchParams(window.location.search);
    const page = sp.get("page");
    if (page == null || page === "" || page === "1") {
      return;
    }
    sp.set("page", "1");
    const qs = sp.toString();
    router.replace(qs ? `/home?${qs}` : "/home");
  }, [router]);

  return <>{children}</>;
}
