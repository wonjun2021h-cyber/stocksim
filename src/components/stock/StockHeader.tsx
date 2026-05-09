import type { StockInfo } from "@/lib/types";
import { StockLogo } from "@/components/ui/StockLogo";

interface StockHeaderProps {
  stock: StockInfo;
  showPrice?: boolean;
}

export function StockHeader({ stock, showPrice = false }: StockHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <StockLogo ticker={stock.ticker} size="lg" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white">{stock.name}</h1>
          <span className="text-[#888] text-sm">{stock.ticker}</span>
        </div>
        {showPrice && (
          <div className="mt-1">
            <p className="text-base font-semibold text-white">
              {stock.currentPrice !== null
                ? `$${stock.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "로딩 중..."}
            </p>
            {stock.hasInsufficientData ? (
              <p className="text-sm font-medium mt-0.5 text-[#f6c453]">데이터 부족</p>
            ) : stock.annualReturnRate !== null && (
              <p
                className={`text-sm font-medium mt-0.5 ${
                  stock.annualReturnRate >= 0
                    ? "text-[#ff4d4d]"
                    : "text-[#4da6ff]"
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
        )}
      </div>
    </div>
  );
}
