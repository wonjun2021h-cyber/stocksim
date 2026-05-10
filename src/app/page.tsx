"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";
import { MarketTicker } from "@/components/home/MarketTicker";
import { PopularStocks } from "@/components/home/PopularStocks";
import { StockListSkeleton } from "@/components/ui/Skeleton";
import { fetchAllStocks } from "@/lib/csvParser";
import type { StockInfo } from "@/lib/types";

export default function HomePage() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStocks()
      .then((s) => setStocks(s))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-page">
      {/* Top bar: nav + search */}
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar>
          <SearchBar
            stocks={stocks}
            variant="navbar"
            placeholder="주식 검색하기"
          />
        </HeaderToolbar>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
        {/* Left column — hero */}
        <section className="flex flex-col gap-8 mt-20 lg:mt-16">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-ink leading-snug">
              내 미래 자산을
              <br />
              예측해보세요
            </h1>
            <div className="space-y-1 text-muted text-sm leading-relaxed">
              <p>투자 금액 주기 기간을 입력하면</p>
              <p>최근 12년치 데이터를 활용해서</p>
              <p>내 미래의 자산을 한 번에 계산해드립니다</p>
            </div>
          </div>

          {/* Gift box illustration */}
          <div className="text-8xl select-none" aria-hidden="true">
            🎁
          </div>
        </section>

        {/* Right column — market data + popular stocks */}
        <section className="flex flex-col gap-6">
          {/* Market tickers */}
          <MarketTicker />

          {/* Popular stocks */}
          <div>
            <h2 className="text-ink font-semibold mb-3 flex items-center gap-2">
              인기 주식
              <span aria-label="인기">📈</span>
            </h2>
            {loading ? (
              <StockListSkeleton count={8} />
            ) : (
              <PopularStocks stocks={stocks} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
