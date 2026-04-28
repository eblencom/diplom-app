function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDisplayDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDisplayDateTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${formatDisplayDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDisplayYmd(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function parseDisplayDateToYmd(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}
