"use client";

import Link from "next/link";
import type { StockInfo } from "@/lib/types";
import { StockLogo } from "@/components/ui/StockLogo";

interface PopularStocksProps {
  stocks: StockInfo[];
}

// Display order / ranking
const POPULAR_ORDER = [
  "AMD",
  "NVDA",
  "TSLA",
  "INTC",
  "MU",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "GOOG",
  "QQQ",
  "SPY",
  "VOO",
  "LLY",
  "SNDK",
  "BRK.A",
];

export function PopularStocks({ stocks }: PopularStocksProps) {
  const stockMap = new Map<string, StockInfo>(stocks.map((s) => [s.ticker, s]));

  const ordered = POPULAR_ORDER.map((ticker) => stockMap.get(ticker)).filter(
    Boolean
  ) as StockInfo[];

  return (
    <div className="rounded-2xl bg-[#333333] overflow-hidden">
      <div className="divide-y divide-[#3a3a3a]">
        {ordered.map((stock, index) => (
          <Link
            key={stock.ticker}
            href={
              stock.priceHistory.length > 0
                ? `/stock/${stock.ticker}`
                : "#"
            }
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#3a3a3a] transition-colors duration-150 group"
          >
            {/* Rank */}
            <span className="text-[#666] text-sm w-5 text-center shrink-0">
              {index + 1}
            </span>

            {/* Logo */}
            <StockLogo ticker={stock.ticker} size="sm" />

            {/* Name + ticker */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate group-hover:text-white">
                {stock.name}
              </p>
            </div>

            {/* Flag emoji */}
            <span className="text-base shrink-0">🇺🇸</span>

            {/* Annual return */}
            {stock.hasInsufficientData ? (
              <span className="text-xs font-semibold shrink-0 text-[#f6c453]">
                데이터 부족
              </span>
            ) : stock.annualReturnRate !== null && (
              <span
                className={`text-xs font-semibold shrink-0 ${
                  stock.annualReturnRate >= 0
                    ? "text-[#ff4d4d]"
                    : "text-[#4da6ff]"
                }`}
              >
                {stock.hasPeriodMismatchWarning ? "⚠️ " : ""}
                {stock.annualReturnRate >= 0 ? "+" : ""}
                {stock.annualReturnRate.toFixed(1)}% CAGR (
                {Math.round((stock.annualReturnPeriodYears ?? 0) * 10) / 10}년 기준)
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
