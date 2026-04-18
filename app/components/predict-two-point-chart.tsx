type Props = {
  priceBefore: number;
  priceAfter: number;
  /** Подпись к точке B (горизонт в минутах). */
  lagMinutes?: number;
};

function lagCaption(lagMinutes?: number) {
  if (lagMinutes == null || !Number.isFinite(lagMinutes)) {
    return "A — до, B — после";
  }
  const m = Math.round(lagMinutes);
  if (m >= 60 && m % 60 === 0) {
    const h = m / 60;
    return `A — до, B — через ${h} ч`;
  }
  return `A — до, B — через ${m} мин`;
}

/** Две точки: A = цена в минуту новости, B = закрытие свечи через lagMinutes минут (MOEX 1m). */
export function PredictTwoPointChart({ priceBefore, priceAfter, lagMinutes }: Props) {
  const min = Math.min(priceBefore, priceAfter);
  const max = Math.max(priceBefore, priceAfter);
  const span = max - min || 1;
  const pad = span * 0.12;
  const lo = min - pad;
  const hi = max + pad;
  const h = 72;
  const y = (p: number) => h - ((p - lo) / (hi - lo)) * (h - 16) - 8;
  const x0 = 16;
  const x1 = 184;

  return (
    <div className="mt-2 w-full max-w-[220px] rounded-lg border border-white/10 bg-black/30 p-2 sm:ml-auto">
      <p className="mb-1 text-center text-[10px] text-white/50">{lagCaption(lagMinutes)}</p>
      <svg viewBox={`0 0 200 ${h + 18}`} className="mx-auto block w-full" role="img" aria-label="График двух цен">
        <line
          x1={x0}
          y1={y(priceBefore)}
          x2={x1}
          y2={y(priceAfter)}
          stroke="rgb(167, 139, 250)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={x0} cy={y(priceBefore)} r="5" fill="rgb(167, 139, 250)" />
        <circle cx={x1} cy={y(priceAfter)} r="5" fill="rgb(52, 211, 153)" />
        <text x={x0 - 2} y={y(priceBefore) - 8} fill="rgba(255,255,255,0.65)" fontSize="11">
          A
        </text>
        <text x={x1 - 2} y={y(priceAfter) - 8} fill="rgba(255,255,255,0.65)" fontSize="11">
          B
        </text>
        <text x="100" y={h + 14} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9">
          {priceBefore.toFixed(2)} → {priceAfter.toFixed(2)}
        </text>
      </svg>
    </div>
  );
}
