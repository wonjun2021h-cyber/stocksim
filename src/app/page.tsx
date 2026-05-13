"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";
import { MarketTicker } from "@/components/home/MarketTicker";
import { PopularStocks } from "@/components/home/PopularStocks";
import { NewsPanel } from "@/components/home/NewsPanel";
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
      {/* Top bar */}
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

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

        {/* ── Column 1: Hero + News Feed ── */}
        <section className="flex flex-col gap-6 pt-6">
          {/* Hero text */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-ink leading-snug">
                내 미래 자산을
                <br />
                예측해보세요 🎁
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                투자 금액 주기 기간을 입력하면
                <br />
                최근 12년치 데이터를 활용해서
                <br />
                내 미래의 자산을 한 번에 계산해드립니다
              </p>
            </div>

            <Link
              href="/stocks"
              className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl bg-ink text-panel text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              주식 시뮬레이션 시작하기
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-line" />

          {/* Real-time news feed */}
          <div className="bg-panel rounded-2xl border border-line p-4">
            <NewsPanel limit={6} />
          </div>
        </section>

        {/* ── Column 2: Market + Popular Stocks ── */}
        <section className="flex flex-col gap-5 pt-6">
          <MarketTicker />

          <div className="bg-panel rounded-2xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
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
