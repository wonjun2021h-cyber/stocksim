import type { StockInfo } from "@/lib/types";
import { StockLogo } from "@/components/ui/StockLogo";

interface StockHeaderProps {
  stock: StockInfo;
}

export function StockHeader({ stock }: StockHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <StockLogo ticker={stock.ticker} size="lg" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-ink">{stock.name}</h1>
          <span className="text-subtle text-sm">{stock.ticker}</span>
        </div>
        <div className="mt-1">
          {stock.hasInsufficientData ? (
            <p className="text-sm font-medium mt-0.5 text-accent-warn" data-no-share>
              데이터 부족
            </p>
          ) : stock.annualReturnRate !== null && (
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
    </div>
  );
}
