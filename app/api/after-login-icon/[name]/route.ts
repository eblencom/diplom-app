import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getProjectRoot } from "@/lib/project-root";

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params;
  const safeName = name.trim().replace(/[^0-9]/g, "");

  if (!safeName) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const filePath = path.join(getProjectRoot(), "svgs", "posle_vhoda", `${safeName}.svg`);
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
