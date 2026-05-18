import type { jsPDF } from "jspdf";

function arrayBufferToVfsBinaryString(buffer: ArrayBuffer): string {
  const u8 = new Uint8Array(buffer);
  const chunk = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < u8.length; i += chunk) {
    const slice = u8.subarray(i, Math.min(i + chunk, u8.length));
    parts.push(String.fromCharCode.apply(null, slice as unknown as number[]));
  }
  return parts.join("");
}

const VFS_NAME = "Roboto-Regular.ttf";
const FONT_FAMILY = "Roboto";

export async function embedRobotoCyrillic(doc: jsPDF): Promise<boolean> {
  try {
    const res = await fetch("/fonts/Roboto-Regular.ttf", { cache: "force-cache" });
    if (!res.ok) {
      return false;
    }
    const bin = arrayBufferToVfsBinaryString(await res.arrayBuffer());
    doc.addFileToVFS(VFS_NAME, bin);
    doc.addFont(VFS_NAME, FONT_FAMILY, "normal", "Identity-H");
    doc.addFont(VFS_NAME, FONT_FAMILY, "bold", "Identity-H");
    doc.setFont(FONT_FAMILY, "normal");
    return true;
  } catch {
    return false;
  }
}

/** Noto Serif с кириллицей; в jsPDF регистрируется как `TimesNewRoman` (14 pt — задаётся в экспорте). */
const TIMES_VFS = "TimesNewRoman.ttf";
const TIMES_FAMILY = "TimesNewRoman";

export async function embedTimesNewRomanReportFont(doc: jsPDF): Promise<boolean> {
  try {
    const res = await fetch("/fonts/NotoSerif-Regular.ttf", { cache: "force-cache" });
    if (!res.ok) {
      return false;
    }
    const bin = arrayBufferToVfsBinaryString(await res.arrayBuffer());
    doc.addFileToVFS(TIMES_VFS, bin);
    doc.addFont(TIMES_VFS, TIMES_FAMILY, "normal", "Identity-H");
    doc.addFont(TIMES_VFS, TIMES_FAMILY, "bold", "Identity-H");
    doc.setFont(TIMES_FAMILY, "normal");
    return true;
  } catch {
    return false;
  }
}
