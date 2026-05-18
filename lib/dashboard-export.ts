import type { WorkSheet } from "xlsx-js-style";
import type { jsPDF } from "jspdf";

import { embedRobotoCyrillic, embedTimesNewRomanReportFont } from "@/lib/dashboard-pdf-cyrillic";
import type {
  DashboardClosedPredictRow,
  DashboardExportAdminUser,
  DashboardStatsPayload,
} from "@/lib/dashboard-types";
import { formatDisplayYmd } from "@/lib/display-date";

/** @deprecated Используйте `DashboardExportAdminUser` из dashboard-types. */
export type { DashboardExportAdminUser } from "@/lib/dashboard-types";

export type DashboardExportMeta = {
  sliceLabel: string;
};

type XLSXLib = typeof import("xlsx-js-style");

const XL = {
  navy: "172033",
  border: "D6DEE8",
  titleBg: "EAF1F8",
  headerBg: "172033",
  rowAlt: "F8FAFC",
  white: "FFFFFF",
  ink: "172033",
  positiveBg: "DCFCE7",
  positiveInk: "166534",
  negativeBg: "FEE2E2",
  negativeInk: "991B1B",
};

const BORDER_THIN = {
  top: { style: "thin" as const, color: { rgb: XL.border } },
  bottom: { style: "thin" as const, color: { rgb: XL.border } },
  left: { style: "thin" as const, color: { rgb: XL.border } },
  right: { style: "thin" as const, color: { rgb: XL.border } },
};

let pdfReportFontFamily: "TimesNewRoman" | "Roboto" = "Roboto";

function predictionRu(p: "positive" | "negative"): string {
  return p === "positive" ? "Позитив" : "Негатив";
}

function outcomeRu(r: "win" | "lose"): string {
  return r === "win" ? "Успешный" : "Неуспешный";
}

function roleRu(role: "admin" | "analyst"): string {
  return role === "admin" ? "Администратор" : "Аналитик";
}

function formatPct(value: number): string {
  return `${value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatRegisteredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString("ru-RU");
}

function xlCell(ws: WorkSheet, XLSX: XLSXLib, r: number, c: number): import("xlsx-js-style").CellObject {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (cell && typeof cell === "object" && "t" in cell) {
    return cell as import("xlsx-js-style").CellObject;
  }
  const empty: import("xlsx-js-style").CellObject = { t: "s", v: "" };
  ws[addr] = empty;
  return empty;
}

function xlSetStyle(
  ws: WorkSheet,
  XLSX: XLSXLib,
  r: number,
  c: number,
  s: import("xlsx-js-style").CellStyle,
): void {
  const cell = xlCell(ws, XLSX, r, c);
  cell.s = { ...cell.s, ...s };
}

function xlPaintRow(
  ws: WorkSheet,
  XLSX: XLSXLib,
  r: number,
  c0: number,
  c1: number,
  s: import("xlsx-js-style").CellStyle,
): void {
  for (let c = c0; c <= c1; c++) {
    xlSetStyle(ws, XLSX, r, c, s);
  }
}

function xlBorderedCell(
  ws: WorkSheet,
  XLSX: XLSXLib,
  r: number,
  c: number,
  s: import("xlsx-js-style").CellStyle,
): void {
  xlSetStyle(ws, XLSX, r, c, { ...s, border: BORDER_THIN });
}

function xlSetRangeStyle(
  ws: WorkSheet,
  XLSX: XLSXLib,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  s: import("xlsx-js-style").CellStyle,
): void {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      xlSetStyle(ws, XLSX, r, c, s);
    }
  }
}

function buildPredictHeader(scopeAll: boolean): string[] {
  const h = ["№", "Дата новости", "Тикер", "Компания"];
  if (scopeAll) {
    h.push("Пользователь");
  }
  h.push("Прогноз", "Изменение цены, %", "Исход");
  return h;
}

function buildPredictBody(rows: DashboardClosedPredictRow[], scopeAll: boolean): (string | number)[][] {
  return rows.map((row, i) => {
    const line: (string | number)[] = [
      i + 1,
      formatDisplayYmd(row.newsDate),
      row.ticker,
      row.companyName,
    ];
    if (scopeAll) {
      line.push(row.userLogin ?? "—");
    }
    line.push(predictionRu(row.prediction), formatPct(row.resultPercent), outcomeRu(row.result));
    return line;
  });
}

function stylePredictSheet(
  ws: WorkSheet,
  XLSX: XLSXLib,
  rows: DashboardClosedPredictRow[],
  scopeAll: boolean,
  introRows: number,
): void {
  const numCols = buildPredictHeader(scopeAll).length;
  const headerRow = introRows;
  ws["!rows"] = [
    { hpt: 26 },
    { hpt: 21 },
    { hpt: 21 },
    { hpt: 21 },
    { hpt: 25 },
    ...rows.map(() => ({ hpt: 24 })),
  ];
  xlPaintRow(ws, XLSX, 0, 0, numCols - 1, {
    fill: { patternType: "solid", fgColor: { rgb: XL.navy } },
    font: { bold: true, sz: 14, color: { rgb: XL.white }, name: "Aptos Display" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER_THIN,
  });
  for (let r = 1; r < introRows; r++) {
    xlPaintRow(ws, XLSX, r, 0, numCols - 1, {
      fill: { patternType: "solid", fgColor: { rgb: r === 4 ? XL.white : XL.titleBg } },
      font: { sz: 11, name: "Aptos", color: { rgb: r === 4 ? XL.white : XL.ink } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER_THIN,
    });
  }
  xlPaintRow(ws, XLSX, headerRow, 0, numCols - 1, {
    fill: { patternType: "solid", fgColor: { rgb: XL.headerBg } },
    font: { bold: false, sz: 11, color: { rgb: XL.white }, name: "Aptos" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER_THIN,
  });
  for (let i = 0; i < rows.length; i++) {
    const r = headerRow + 1 + i;
    const row = rows[i];
    for (let c = 0; c < numCols; c++) {
      xlBorderedCell(ws, XLSX, r, c, {
        fill: { patternType: "solid", fgColor: { rgb: i % 2 === 0 ? XL.rowAlt : XL.white } },
        font: {
          sz: 11,
          name: "Aptos",
          color: { rgb: XL.ink },
          bold: false,
        },
        alignment: {
          vertical: "center",
          wrapText: true,
          horizontal: c === 3 || (scopeAll && c === 4) ? "left" : "center",
        },
      });
    }
    const predCol = scopeAll ? 5 : 4;
    const resultCol = predCol + 2;
    xlSetStyle(ws, XLSX, r, predCol, {
      fill: {
        patternType: "solid",
        fgColor: { rgb: row.prediction === "positive" ? XL.positiveBg : XL.negativeBg },
      },
      font: {
        bold: false,
        name: "Aptos",
        color: { rgb: row.prediction === "positive" ? XL.positiveInk : XL.negativeInk },
      },
      alignment: { horizontal: "center", vertical: "center" },
    });
    xlSetStyle(ws, XLSX, r, resultCol, {
      fill: {
        patternType: "solid",
        fgColor: { rgb: row.result === "win" ? XL.positiveBg : XL.negativeBg },
      },
      font: {
        bold: false,
        name: "Aptos",
        color: { rgb: row.result === "win" ? XL.positiveInk : XL.negativeInk },
      },
      alignment: { horizontal: "center", vertical: "center" },
    });
  }
}

function styleUsersSheet(ws: WorkSheet, XLSX: XLSXLib, dataRows: number): void {
  const cols = 4;
  ws["!rows"] = [{ hpt: 26 }, { hpt: 36 }, ...Array.from({ length: dataRows }, () => ({ hpt: 23 }))];
  xlPaintRow(ws, XLSX, 0, 0, cols - 1, {
    fill: { patternType: "solid", fgColor: { rgb: XL.navy } },
    font: { bold: true, sz: 14, color: { rgb: XL.white }, name: "Aptos Display" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER_THIN,
  });
  xlPaintRow(ws, XLSX, 1, 0, cols - 1, {
    fill: { patternType: "solid", fgColor: { rgb: XL.headerBg } },
    font: { bold: false, sz: 11, color: { rgb: XL.white }, name: "Aptos" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER_THIN,
  });
  for (let i = 0; i < dataRows; i++) {
    const r = 2 + i;
    const alt = i % 2 === 0;
    xlPaintRow(ws, XLSX, r, 0, cols - 1, {
      fill: { patternType: "solid", fgColor: { rgb: alt ? XL.rowAlt : XL.white } },
      font: { sz: 11, name: "Aptos", color: { rgb: XL.ink } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: BORDER_THIN,
    });
  }
  xlSetRangeStyle(ws, XLSX, 2, 0, dataRows + 1, 0, {
    alignment: { horizontal: "left", vertical: "center" },
    font: { bold: false, name: "Aptos", color: { rgb: XL.ink } },
  });
}

export async function exportDashboardXlsx(
  data: DashboardStatsPayload,
  meta: DashboardExportMeta,
): Promise<void> {
  const XLSX = (await import("xlsx-js-style")) as XLSXLib;
  const wb = XLSX.utils.book_new();
  const scopeAll = data.scope === "all";
  const rows = data.closedPredictRows ?? [];
  const intro: (string | number)[][] = [
    ["DIPLOMAPP · Сравнение прогнозов с фактом"],
    [`Период: ${formatDisplayYmd(data.from)} — ${formatDisplayYmd(data.to)}`],
    [`Срез: ${meta.sliceLabel}`],
    [`Сформировано: ${new Date().toLocaleString("ru-RU")}`],
  ];
  const header = buildPredictHeader(scopeAll);
  const body = buildPredictBody(rows, scopeAll);
  const wsPred = XLSX.utils.aoa_to_sheet([...intro, header, ...body]);
  wsPred["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: header.length - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: header.length - 1 } },
  ];
  wsPred["!cols"] = scopeAll
    ? [
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 34 },
        { wch: 20 },
        { wch: 15 },
        { wch: 18 },
        { wch: 17 },
      ]
    : [
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 42 },
        { wch: 15 },
        { wch: 18 },
        { wch: 17 },
      ];
  wsPred["!views"] = [{ state: "frozen", ySplit: intro.length + 1, topLeftCell: "A6", activePane: "bottomLeft" }];
  stylePredictSheet(wsPred, XLSX, rows, scopeAll, intro.length);
  XLSX.utils.book_append_sheet(wb, wsPred, "Прогнозы");

  const adminUsers = data.adminExportUsers;
  if (scopeAll && adminUsers != null && adminUsers.length > 0) {
    const uHead = ["Логин", "Дата регистрации", "Прогнозов за период", "Роль"];
    const uBody = adminUsers.map((u) => [
      u.login,
      formatRegisteredAt(u.registeredAt),
      u.predictCount,
      roleRu(u.role),
    ]);
    const wsUsers = XLSX.utils.aoa_to_sheet([
      ["DIPLOMAPP · Пользователи системы"],
      uHead,
      ...uBody,
    ]);
    wsUsers["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    wsUsers["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    styleUsersSheet(wsUsers, XLSX, uBody.length);
    XLSX.utils.book_append_sheet(wb, wsUsers, "Пользователи");
  }

  XLSX.writeFile(wb, `dashboard_${data.from}_${data.to}.xlsx`);
}

function pdfSetBody(doc: jsPDF, size = 11): void {
  doc.setFont(pdfReportFontFamily, "normal");
  doc.setFontSize(size);
}

function pdfSetBold(doc: jsPDF, size = 11): void {
  doc.setFont(pdfReportFontFamily, "bold");
  doc.setFontSize(size);
}

function pdfTextWidth(doc: jsPDF, text: string): number {
  return doc.getTextWidth(text);
}

function pdfTruncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (pdfTextWidth(doc, text) <= maxWidth) {
    return text;
  }
  let out = text;
  while (out.length > 1 && pdfTextWidth(doc, `${out}…`) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function pdfSetNavy(doc: jsPDF): void {
  doc.setFillColor(23, 32, 51);
}

function pdfSetBorder(doc: jsPDF): void {
  doc.setDrawColor(214, 222, 232);
  doc.setLineWidth(0.18);
}

function pdfSetInk(doc: jsPDF): void {
  doc.setTextColor(23, 32, 51);
}

function pdfSetMuted(doc: jsPDF): void {
  doc.setTextColor(100, 116, 139);
}

function pdfSectionBar(doc: jsPDF, y: number, title: string): number {
  const left = 12;
  const right = doc.internal.pageSize.getWidth() - 12;
  const barH = 8.5;
  pdfSetNavy(doc);
  doc.roundedRect(left, y, right - left, barH, 1.8, 1.8, "F");
  doc.setTextColor(255, 255, 255);
  pdfSetBold(doc, 10.5);
  doc.text(title, left + 3, y + 5.8);
  pdfSetInk(doc);
  pdfSetBody(doc, 9.5);
  return y + barH + 3.2;
}

function pdfCover(doc: jsPDF, data: DashboardStatsPayload, meta: DashboardExportMeta): number {
  const w = doc.internal.pageSize.getWidth();
  pdfSetNavy(doc);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  pdfSetBold(doc, 18);
  doc.text("Отчёт дашборда", 14, 14);
  pdfSetBody(doc, 10.5);
  doc.text("Сравнение прогнозов с фактическим изменением цены", 14, 22);

  const y = 42;
  doc.setFillColor(248, 250, 252);
  pdfSetBorder(doc);
  doc.roundedRect(12, y - 8, w - 24, 20, 2, 2, "FD");
  pdfSetMuted(doc);
  pdfSetBody(doc, 9);
  doc.text("Период", 18, y - 1.5);
  doc.text("Срез", 84, y - 1.5);
  doc.text("Дата формирования", 207, y - 1.5);
  pdfSetInk(doc);
  pdfSetBold(doc, 10.5);
  doc.text(`${formatDisplayYmd(data.from)} — ${formatDisplayYmd(data.to)}`, 18, y + 6);
  doc.text(pdfTruncate(doc, meta.sliceLabel, 108), 84, y + 6);
  doc.text(new Date().toLocaleString("ru-RU"), 207, y + 6);
  return y + 20;
}

type PdfAlign = "left" | "center" | "right";
type PdfColumn = { label: string; x: number; w: number; align: PdfAlign };

function pdfDrawCell(
  doc: jsPDF,
  text: string,
  col: PdfColumn,
  y: number,
  h: number,
  options?: {
    fill?: [number, number, number];
    textColor?: [number, number, number];
    bold?: boolean;
    header?: boolean;
  },
): void {
  if (options?.fill) {
    doc.setFillColor(...options.fill);
    pdfSetBorder(doc);
    doc.rect(col.x, y, col.w, h, "FD");
  } else {
    pdfSetBorder(doc);
    doc.rect(col.x, y, col.w, h);
  }
  if (options?.textColor) {
    doc.setTextColor(...options.textColor);
  } else {
    pdfSetInk(doc);
  }
  if (options?.bold) {
    pdfSetBold(doc, options.header ? 9.5 : 9.2);
  } else {
    pdfSetBody(doc, options?.header ? 9.5 : 9.2);
  }
  const pad = 2.2;
  const maxTextWidth = Math.max(4, col.w - pad * 2);
  const value = pdfTruncate(doc, text, maxTextWidth);
  const tx =
    col.align === "center" ? col.x + col.w / 2 : col.align === "right" ? col.x + col.w - pad : col.x + pad;
  doc.text(value, tx, y + h / 2 + 2.6, { align: col.align });
}

function pdfPredictColumns(scopeAll: boolean): PdfColumn[] {
  const left = 12;
  const widths = scopeAll
    ? [12, 25, 20, 78, 42, 32, 29, 35]
    : [12, 27, 22, 110, 36, 31, 35];
  const labels = scopeAll
    ? ["№", "Дата", "Тикер", "Компания", "Пользователь", "Прогноз", "Изм., %", "Исход"]
    : ["№", "Дата", "Тикер", "Компания", "Прогноз", "Изм., %", "Исход"];
  const align: PdfAlign[] = scopeAll
    ? ["center", "center", "center", "left", "left", "center", "right", "center"]
    : ["center", "center", "center", "left", "center", "right", "center"];
  let x = left;
  return widths.map((w, i) => {
    const col = { label: labels[i], x, w, align: align[i] };
    x += w;
    return col;
  });
}

function pdfPredictTable(
  doc: jsPDF,
  yStart: number,
  rows: DashboardClosedPredictRow[],
  scopeAll: boolean,
): number {
  let y = pdfSectionBar(doc, yStart, "Сравнение прогнозов с фактическим изменением цены");
  const left = 12;
  const cols = pdfPredictColumns(scopeAll);
  const tableW = cols.reduce((sum, col) => sum + col.w, 0);
  const rowH = 9.2;
  const headH = 9.6;

  const drawHeader = (hy: number) => {
    for (const col of cols) {
      pdfDrawCell(doc, col.label, col, hy, headH, {
        fill: [23, 32, 51],
        textColor: [255, 255, 255],
        bold: true,
        header: true,
      });
    }
  };

  if (rows.length === 0) {
    doc.setFillColor(248, 250, 252);
    pdfSetBorder(doc);
    doc.roundedRect(left, y, tableW, 16, 2, 2, "FD");
    pdfSetMuted(doc);
    pdfSetBody(doc, 10);
    doc.text("За выбранный период нет закрытых прогнозов (позитив/негатив).", left + 4, y + 9.8);
    return y + 20;
  }

  drawHeader(y);
  y += headH;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (y > 190) {
      doc.addPage();
      y = 16;
      drawHeader(y);
      y += headH;
    }
    const baseFill: [number, number, number] = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    const predFill: [number, number, number] =
      row.prediction === "positive" ? [220, 252, 231] : [254, 226, 226];
    const predText: [number, number, number] =
      row.prediction === "positive" ? [22, 101, 52] : [153, 27, 27];
    const outcomeFill: [number, number, number] =
      row.result === "win" ? [220, 252, 231] : [254, 226, 226];
    const outcomeText: [number, number, number] =
      row.result === "win" ? [22, 101, 52] : [153, 27, 27];
    const values = [
      String(i + 1),
      formatDisplayYmd(row.newsDate),
      row.ticker,
      row.companyName,
    ];
    let predColIdx = 4;
    if (scopeAll) {
      values.push(row.userLogin ?? "—");
      predColIdx = 5;
    }
    values.push(predictionRu(row.prediction), formatPct(row.resultPercent), outcomeRu(row.result));
    values.forEach((value, c) => {
      const isPrediction = c === predColIdx;
      const isOutcome = c === predColIdx + 2;
      pdfDrawCell(doc, value, cols[c], y, rowH, {
        fill: isPrediction ? predFill : isOutcome ? outcomeFill : baseFill,
        textColor: isPrediction ? predText : isOutcome ? outcomeText : [23, 32, 51],
        bold: c === 0 || c === 2 || isPrediction || isOutcome,
      });
    });
    y += rowH;
  }
  return y + 6;
}

function pdfUsersTable(
  doc: jsPDF,
  yStart: number,
  adminUsers: DashboardExportAdminUser[],
): number {
  if (adminUsers.length === 0) {
    return yStart;
  }
  let y = yStart;
  if (y > 170) {
    doc.addPage();
    y = 16;
  }
  y = pdfSectionBar(doc, y, "Пользователи системы");
  const left = 12;
  const rowH = 8.2;
  const headH = 8.8;
  const cols: PdfColumn[] = [
    { label: "Логин", x: left, w: 84, align: "left" },
    { label: "Дата регистрации", x: left + 84, w: 58, align: "center" },
    { label: "Прогнозов за период", x: left + 142, w: 58, align: "center" },
    { label: "Роль", x: left + 200, w: 73, align: "center" },
  ];

  const drawHeader = (hy: number) => {
    cols.forEach((col) =>
      pdfDrawCell(doc, col.label, col, hy, headH, {
        fill: [23, 32, 51],
        textColor: [255, 255, 255],
        bold: true,
        header: true,
      }),
    );
  };

  drawHeader(y);
  y += headH;
  for (let i = 0; i < adminUsers.length; i++) {
    const u = adminUsers[i];
    if (y > 190) {
      doc.addPage();
      y = 16;
      drawHeader(y);
      y += headH;
    }
    const fill: [number, number, number] = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    [u.login, formatRegisteredAt(u.registeredAt), String(u.predictCount), roleRu(u.role)].forEach(
      (value, c) => {
        pdfDrawCell(doc, value, cols[c], y, rowH, {
          fill,
          textColor: [23, 32, 51],
          bold: c === 0,
        });
      },
    );
    y += rowH;
  }
  return y + 6;
}

function pdfFooterAllPages(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(pdfReportFontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(130, 125, 160);
    doc.text(`DiplomApp · стр. ${i} / ${total}`, w / 2, doc.internal.pageSize.getHeight() - 6, {
      align: "center",
    });
  }
}

export async function exportDashboardPdf(
  data: DashboardStatsPayload,
  meta: DashboardExportMeta,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  if (await embedRobotoCyrillic(doc)) {
    pdfReportFontFamily = "Roboto";
  } else {
    await embedTimesNewRomanReportFont(doc);
    pdfReportFontFamily = "TimesNewRoman";
  }
  pdfSetBody(doc, 10);

  let y = pdfCover(doc, data, meta);
  y = pdfPredictTable(doc, y, data.closedPredictRows ?? [], data.scope === "all");

  if (data.scope === "all" && data.adminExportUsers != null) {
    y = pdfUsersTable(doc, y, data.adminExportUsers);
  }

  pdfFooterAllPages(doc);
  doc.save(`dashboard_${data.from}_${data.to}.pdf`);
}
