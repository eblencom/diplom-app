type WinLoseDonutProps = {
  win: number;
  lose: number;
  className?: string;
};

export function WinLoseDonut({ win, lose, className }: WinLoseDonutProps) {
  const total = win + lose;
  const winDeg = total <= 0 ? 0 : (win / total) * 360;

  const ringStyle =
    total <= 0
      ? { background: "conic-gradient(rgb(63 63 70) 0deg 360deg)" as const }
      : {
          background: `conic-gradient(rgb(52 211 153) 0deg ${winDeg}deg, rgb(244 63 94) ${winDeg}deg 360deg)`,
        };

  return (
    <div className={className ?? ""}>
      <p className="mb-3 text-center text-sm font-semibold text-white/65">Win / Lose</p>
      <div className="relative mx-auto size-[152px] sm:size-[160px]">
        <div
          className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          style={ringStyle}
          aria-hidden
        />
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-[#0a061f] text-center">
          <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
            {total > 0 ? `${Math.round((win / total) * 100)}%` : "—"}
          </span>
          <span className="text-sm text-white/60">win</span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-base font-semibold">
        <span className="inline-flex items-center gap-2 text-white">
          <span className="size-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
          Win <span className="tabular-nums">{win}</span>
        </span>
        <span className="inline-flex items-center gap-2 text-white">
          <span className="size-2.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
          Lose <span className="tabular-nums">{lose}</span>
        </span>
      </div>
    </div>
  );
}
