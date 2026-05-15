"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";
import { StockHeader } from "@/components/stock/StockHeader";
import { ResultCards } from "@/components/stock/ResultCards";
import { ShareActions } from "@/components/stock/ShareActions";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAndParseStocks, fetchAllStocks } from "@/lib/csvParser";
import { loadStockByTicker } from "@/lib/stockDataLoader";
import {
  calculateSimulationByStockName,
  calculateSimulationScenarios,
  type SimulationResult,
} from "@/lib/simulation-logic";
import type { StockInfo } from "@/lib/types";

export default function ResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker as string);

  const amount = Number(searchParams.get("amount") ?? 0);
  const periodDays = Number(searchParams.get("period") ?? 30);
  const durationValue = Number(searchParams.get("durationValue") ?? 0);
  const durationUnit =
    (searchParams.get("durationUnit") as "days" | "months" | "years" | null) ??
    "months";

  const [stock, setStock] = useState<StockInfo | null>(null);
  const [allStocks, setAllStocks] = useState<StockInfo[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!amount || !periodDays || !durationValue) {
      router.replace(`/stock/${ticker}`);
      return;
    }

    Promise.all([fetchAndParseStocks(), fetchAllStocks()]).then(async ([map, all]) => {
      setAllStocks(all);

      // 1) JSON 파일에서 히스토리 포함해 로드 시도 (다운로드된 종목)
      const jsonStock = await loadStockByTicker(ticker);
      if (jsonStock && jsonStock.priceHistory.length > 0) {
        setStock(jsonStock);
        const calc = calculateSimulationScenarios(jsonStock.priceHistory, ticker);
        setResult(calc);
        setLoading(false);
        return;
      }

      // 2) CSV 폴백
      const found = map.get(ticker) ?? map.get(ticker.toUpperCase());
      if (!found) {
        router.replace("/");
        return;
      }
      setStock(found);
      const calc = calculateSimulationByStockName(found.name, all);
      setResult(calc);
      setLoading(false);
    });
  }, [ticker, amount, periodDays, durationValue, durationUnit, router]);

  const durationDays =
    durationUnit === "years"
      ? durationValue * 365
      : durationUnit === "months"
        ? durationValue * 30
        : durationValue;
  const durationYears = durationDays / 365;
  const investmentCount = Math.max(1, Math.floor(durationDays / periodDays) + 1);
  const totalInvestedKRW = amount * investmentCount;
  // Positive message based on result
  const isGood = result !== null && result.base > 0;

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar>
          <SearchBar stocks={allStocks} variant="navbar" />
        </HeaderToolbar>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-8 flex flex-col gap-6">
        <div
          id="result-share-capture"
          className="rounded-2xl bg-panel p-6 space-y-6 border border-line dark:border-transparent"
        >
          {loading || !stock ? (
            <div className="flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ) : (
            <StockHeader stock={stock} />
          )}

          {/* Result cards */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : result ? (
            <ResultCards
              result={result}
              totalInvestedKRW={totalInvestedKRW}
              durationYears={durationYears}
              totalPayments={investmentCount}
              periodicPayment={amount}
              paymentIntervalDays={periodDays}
              ticker={ticker}
            />
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-danger-bg border border-danger-border px-4 py-3">
              <span className="text-danger-text text-base">⚠️</span>
              <p className="text-danger-text text-sm font-medium">
                유효한 가격 데이터가 없어 시뮬레이션을 계산할 수 없습니다
              </p>
            </div>
          )}
        </div>

        {!loading && (
          <p className="text-ink font-semibold text-center text-base">
            {isGood
              ? "수익을 낼 수 있어요!! 📈"
              : "장기 투자로 기회를 잡아보세요! 📊"}
          </p>
        )}

        {!loading && stock && result && (
          <ShareActions ticker={ticker} />
        )}

        {/* Bottom search bar */}
        <div className="rounded-full bg-panel overflow-hidden border border-line dark:border-transparent">
          <SearchBar
            stocks={allStocks}
            variant="inline"
            placeholder="주식 검색하기"
            className="w-full"
          />
        </div>
      </main>
    </div>
  );
}
