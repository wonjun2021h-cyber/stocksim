"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";
import { MobileSearchButton } from "@/components/layout/MobileSearch";
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
      {/* ── 상단 헤더 ── */}
      <header className="flex items-center justify-between pr-4 md:pr-6">
        <Navbar />
        <HeaderToolbar>
          {/* 모바일: 검색 버튼 */}
          <MobileSearchButton stocks={stocks} />
          {/* 데스크톱: 검색 인풋 */}
          <div className="hidden md:block">
            <SearchBar stocks={stocks} variant="navbar" placeholder="주식 검색하기" />
          </div>

        </HeaderToolbar>
      </header>

      {/* ══════════════════════════════════════
          모바일 레이아웃
      ══════════════════════════════════════ */}
      <div className="md:hidden px-5 pt-2 pb-6 flex flex-col gap-5">

        {/* 히어로 섹션 */}
        <div className="flex items-center justify-between gap-4 bg-panel rounded-2xl p-5 border border-line dark:border-transparent">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-ink leading-snug">
              내 미래 자산을
              <br />
              예측해보세요
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              투자 금액 주기 기간을 입력하면
              <br />
              최근 12년치 데이터를 활용해서
              <br />
              내 미래의 자산을 한 번에 계산해드립니다
            </p>
          </div>
          <span className="text-6xl shrink-0 select-none" aria-hidden>🎁</span>
        </div>

        {/* 인기주식 + 버튼 행 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span>📌</span>
            <span>인기주식</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/backtest"
              className="flex items-center gap-1 px-3 py-2 rounded-full border border-line bg-panel text-ink text-xs font-bold active:opacity-80 transition-opacity"
            >
              포트폴리오 만들기
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/stocks"
              className="flex items-center gap-1 px-3 py-2 rounded-full bg-orange-500 text-white text-xs font-bold active:opacity-80 transition-opacity shadow-sm"
            >
              시뮬레이션
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 인기 종목 리스트 */}
        <div className="rounded-2xl bg-panel border border-line dark:border-transparent overflow-hidden">
          {loading ? (
            <StockListSkeleton count={8} />
          ) : (
            <PopularStocks stocks={stocks} />
          )}
        </div>

        {/* 시장 지수 */}
        <MarketTicker />

        {/* 뉴스 */}
        <div className="bg-panel rounded-2xl border border-line dark:border-transparent p-4">
          <NewsPanel limit={4} />
        </div>
      </div>

      {/* ══════════════════════════════════════
          데스크톱 레이아웃 (기존)
      ══════════════════════════════════════ */}
      <main className="hidden md:grid max-w-5xl mx-auto px-6 py-10 grid-cols-1 lg:grid-cols-2 gap-16 items-start lg:pt-6">

        {/* 컬럼 1: 히어로 + 뉴스 */}
        <section className="flex flex-col gap-6">
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
            <div className="flex flex-col gap-2">
              <Link
                href="/stocks"
                className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl bg-ink text-panel text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                주식 시뮬레이션 시작하기
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/backtest"
                className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl bg-ink text-panel text-sm font-semibold hover:opacity-80 transition-opacity"
              >
                포트폴리오 만들기
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="border-t border-line" />

          <div className="bg-panel rounded-2xl border border-line p-4">
            <NewsPanel limit={6} />
          </div>
        </section>

        {/* 컬럼 2: 시장 + 인기 종목 */}
        <section className="flex flex-col gap-5 pt-6">
          <MarketTicker />
          <div className="bg-panel rounded-2xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              인기 주식 <span>📈</span>
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
