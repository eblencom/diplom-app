/**
 * Встраивание Roboto (TTF из /public/fonts) в jsPDF для корректной кириллицы.
 * Без этого jsPDF рисует русский текст шрифтом Helvetica и получаются «кракозябры».
 */

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

/** @returns true, если шрифт подключён */
export async function embedRobotoCyrillic(doc: jsPDF): Promise<boolean> {
  try {
    const res = await fetch("/fonts/Roboto-Regular.ttf", { cache: "force-cache" });
    if (!res.ok) {
      return false;
    }
    const bin = arrayBufferToVfsBinaryString(await res.arrayBuffer());
    doc.addFileToVFS(VFS_NAME, bin);
    doc.addFont(VFS_NAME, FONT_FAMILY, "normal", "Identity-H");
    doc.setFont(FONT_FAMILY, "normal");
    return true;
  } catch {
    return false;
  }
}
