function normalizeTicker(raw: string) {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

type Props = {
  ticker: string;
};

export function TickerTradingViewLink({ ticker }: Props) {
  const clean = normalizeTicker(ticker);
  if (!clean) {
    return null;
  }

  const symbol = `MOEX:${clean}`;
  const tradingViewHref = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  const moexParams = new URLSearchParams({ board: "TQBR", code: clean });
  const moexHref = `https://www.moex.com/ru/issue.aspx?${moexParams.toString()}`;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <a
        href={tradingViewHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
      >
        График на TradingView ({symbol})
      </a>
      <a
        href={moexHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
      >
        Страница цены на MOEX (TQBR: {clean})
      </a>
    </div>
  );
}
