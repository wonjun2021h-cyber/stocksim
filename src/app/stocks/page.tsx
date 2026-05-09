"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
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
    <div className="min-h-screen bg-[#2a2a2a]">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <SearchBar stocks={stocks} variant="navbar" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">주식 전체 보기</h1>
          <span className="text-[#888] text-sm">{stocks.length}개 종목</span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="종목명 또는 티커 검색..."
          className="w-full rounded-xl bg-[#333] px-4 py-3 text-sm text-white placeholder-[#555] outline-none border border-transparent focus:border-[#4a4a4a]"
        />

        {/* List */}
        <div className="rounded-2xl bg-[#333333] overflow-hidden">
          {loading ? (
            <StockListSkeleton count={10} />
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#666] py-12 text-sm">
              검색 결과가 없습니다
            </p>
          ) : (
            <div className="divide-y divide-[#3a3a3a]">
              {filtered.map((stock) => (
                <Link
                  key={stock.ticker}
                  href={`/stock/${stock.ticker}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#3a3a3a] transition-colors"
                >
                  <StockLogo ticker={stock.ticker} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {stock.name}
                    </p>
                    <p className="text-[#888] text-xs">{stock.ticker}</p>
                  </div>
                  <span className="text-[#888] text-xs">🇺🇸</span>
                  {stock.hasInsufficientData ? (
                    <span className="text-xs font-semibold text-[#f6c453]">
                      데이터 부족
                    </span>
                  ) : stock.annualReturnRate !== null && (
                    <span
                      className={`text-xs font-semibold ${
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
          )}
        </div>
      </main>
    </div>
  );
}
