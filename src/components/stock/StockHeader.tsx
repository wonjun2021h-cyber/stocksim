"use client";

import type { StockInfo } from "@/lib/types";
import { StockLogo } from "@/components/ui/StockLogo";
import { FavoriteButton } from "@/components/stock/FavoriteButton";

interface StockHeaderProps {
  stock: StockInfo;
}

export function StockHeader({ stock }: StockHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <StockLogo ticker={stock.ticker} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-ink truncate">{stock.name}</h1>
          <span className="text-subtle text-sm shrink-0">{stock.ticker}</span>
        </div>
        <div className="mt-1">
          {stock.annualReturnRate !== null && (
            <p
              data-no-share
              className={`text-sm font-medium mt-0.5 ${
                stock.annualReturnRate >= 0
                  ? "text-accent-up"
                  : "text-accent-down"
              }`}
            >
              {stock.hasPeriodMismatchWarning ? "⚠️ " : ""}
              연 평균 상승률{" "}
              {stock.annualReturnRate >= 0 ? "+" : ""}
              {stock.annualReturnRate.toFixed(2)}% CAGR (
              {Math.round((stock.annualReturnPeriodYears ?? 0) * 10) / 10}년 기준)
            </p>
          )}
        </div>
      </div>
      <FavoriteButton ticker={stock.ticker} name={stock.name} />
    </div>
  );
}
