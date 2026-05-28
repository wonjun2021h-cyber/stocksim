"use client";

import Link from "next/link";
import type { StockInfo } from "@/lib/types";
import { StockLogo } from "@/components/ui/StockLogo";
import { FavoriteButton } from "@/components/stock/FavoriteButton";

interface PopularStocksProps {
  stocks: StockInfo[];
}

// Display order / ranking
const POPULAR_ORDER = [
  "NVDA",
  "AAPL",
  "TSLA",
  "MSFT",
  "AMZN",
  "META",
  "GOOG",
  "AMD",
  "QQQ",
  "SPY",
];

export function PopularStocks({ stocks }: PopularStocksProps) {
  const stockMap = new Map<string, StockInfo>(stocks.map((s) => [s.ticker, s]));

  const ordered = POPULAR_ORDER.map((ticker) => stockMap.get(ticker)).filter(
    Boolean
  ) as StockInfo[];

  return (
    <div className="rounded-2xl bg-panel overflow-hidden border border-line dark:border-transparent">
      <div className="divide-y divide-line">
        {ordered.map((stock, index) => (
          <div
            key={stock.ticker}
            className="flex items-center gap-2 px-4 py-3.5 hover:bg-muted-row transition-colors duration-150 group"
          >
            <Link
              href={`/stock/${encodeURIComponent(stock.ticker)}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              {/* Rank */}
              <span className="text-faint text-sm w-5 text-center shrink-0">
                {index + 1}
              </span>

              {/* Logo */}
              <StockLogo ticker={stock.ticker} size="sm" />

              {/* Name + ticker */}
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm font-medium truncate group-hover:text-ink">
                  {stock.name}
                </p>
              </div>

              {/* Flag emoji */}
              <span className="text-base shrink-0">🇺🇸</span>

              {/* Annual return */}
              {stock.annualReturnRate !== null && (
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    stock.annualReturnRate >= 0
                      ? "text-accent-up"
                      : "text-accent-down"
                  }`}
                >
                  {stock.hasPeriodMismatchWarning ? "⚠️ " : ""}
                  {stock.annualReturnRate >= 0 ? "+" : ""}
                  {stock.annualReturnRate.toFixed(1)}% CAGR (
                  {Math.round((stock.annualReturnPeriodYears ?? 0) * 10) / 10}년 기준)
                </span>
              )}
            </Link>
            <FavoriteButton ticker={stock.ticker} name={stock.name} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
