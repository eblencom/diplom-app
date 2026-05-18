import { unlink } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { deleteCompanyByAdmin } from "@/lib/admin-companies";
import { getProjectRoot } from "@/lib/project-root";
import { getCurrentSession } from "@/lib/session";

function safeProjectFilePath(relativeOrPublicPath: string | null): string | null {
  if (!relativeOrPublicPath?.trim()) {
    return null;
  }
  const root = getProjectRoot();
  const raw = relativeOrPublicPath.replace(/^\//, "");
  const resolved = path.normalize(path.join(root, raw.startsWith("company-logos/") ? "public" : "", raw));
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

async function unlinkIfProjectFile(relativeOrPublicPath: string | null): Promise<void> {
  const filePath = safeProjectFilePath(relativeOrPublicPath);
  if (!filePath) {
    return;
  }
  await unlink(filePath).catch(() => {});
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: idParam } = await ctx.params;
  const companyId = Number(idParam);
  if (!Number.isFinite(companyId) || companyId < 1) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const result = await deleteCompanyByAdmin(companyId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  await Promise.all([
    unlinkIfProjectFile(result.company.logoPath),
    unlinkIfProjectFile(result.company.pricesPath),
  ]);

  return NextResponse.json({ ok: true, company: result.company });
}
