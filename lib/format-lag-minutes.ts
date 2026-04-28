export function formatLagMinutes(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return `${minutes / 1440} сут.`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} ч`;
  }
  return `${minutes} мин`;
}
