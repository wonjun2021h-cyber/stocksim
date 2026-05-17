"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";
import { StockLogo } from "@/components/ui/StockLogo";
import { StockListSkeleton } from "@/components/ui/Skeleton";
import { fetchAllStocks } from "@/lib/csvParser";
import type { StockInfo } from "@/lib/types";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllStocks()
      .then(setStocks)
      .finally(() => setLoading(false));
  }, []);

  const filtered = stocks.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ticker.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar>
          <SearchBar stocks={stocks} variant="navbar" />
        </HeaderToolbar>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">주식 전체 보기</h1>
          <span className="text-subtle text-sm">{stocks.length}개 종목</span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="종목명 또는 티커 검색..."
          className="w-full rounded-xl bg-panel px-4 py-3 text-sm text-ink placeholder:text-faint outline-none border border-transparent focus:border-line"
        />

        {/* List */}
        <div className="rounded-2xl bg-panel overflow-hidden border border-line dark:border-transparent">
          {loading ? (
            <StockListSkeleton count={10} />
          ) : filtered.length === 0 ? (
            <p className="text-center text-faint py-12 text-sm">
              검색 결과가 없습니다
            </p>
          ) : (
            <div className="divide-y divide-line">
              {filtered.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stock/${stock.ticker}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted-row transition-colors"
                >
                  <StockLogo ticker={stock.ticker} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate">
                      {stock.name}
                    </p>
                    <p className="text-subtle text-xs">{stock.ticker}</p>
                  </div>
                  <span className="text-subtle text-xs">🇺🇸</span>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {stock.hasInsufficientData ? (
                      <span className="text-xs font-semibold text-accent-warn">
                        데이터 부족
                      </span>
                    ) : stock.annualReturnRate !== null && (
                      <span
                        className={`text-xs font-semibold ${
                          stock.annualReturnRate >= 0
                            ? "text-accent-up"
                            : "text-accent-down"
                        }`}
                      >
                        {stock.hasPeriodMismatchWarning ? "⚠️ " : ""}
                        {stock.annualReturnRate >= 0 ? "+" : ""}
                        {stock.annualReturnRate.toFixed(1)}% CAGR
                      </span>
                    )}
                    {stock.dataEndDate && (
                      <span className="text-[10px] text-faint">
                        {stock.dataEndDate}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
