import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getProjectRoot } from "@/lib/project-root";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ ticker: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { ticker } = await context.params;
  const safeTicker = ticker.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

  if (!safeTicker) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const filePath = path.join(getProjectRoot(), "imgs", "logos", `${safeTicker}.png`);
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
