"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { StockInfo } from "@/lib/types";

interface MobileSearchProps {
  stocks: StockInfo[];
}

export function MobileSearchButton({ stocks }: MobileSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      stocks
        .filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
        .slice(0, 8)
    );
  }, [query, stocks]);

  function handleSelect(ticker: string) {
    setOpen(false);
    router.push(`/stock/${encodeURIComponent(ticker)}`);
  }

  return (
    <>
      {/* 검색 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-full bg-elevated text-ink text-xs font-medium border border-line active:scale-95 transition-transform min-w-0"
      >
        <svg className="w-3.5 h-3.5 text-subtle shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        주식 검색하기
      </button>

      {/* 전체화면 검색 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-page flex flex-col md:hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-line">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 -ml-2 rounded-full hover:bg-muted-row transition-colors"
              aria-label="닫기"
            >
              <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 검색 입력창 */}
            <div className="flex-1 flex items-center gap-2 bg-elevated rounded-xl px-3 py-2.5 border border-transparent focus-within:border-ring">
              <svg className="w-4 h-4 text-subtle shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="종목명 또는 티커 검색"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-faint"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-faint">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 결과 목록 */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {results.length === 0 && query.trim() === "" && (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-faint">
                <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">종목명 또는 티커를 입력하세요</p>
              </div>
            )}

            {results.length === 0 && query.trim() !== "" && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-faint">
                <p className="text-sm">검색 결과가 없습니다</p>
                <a
                  href="/request-stock"
                  onClick={() => setOpen(false)}
                  className="text-xs text-orange-500 font-semibold hover:underline"
                >
                  찾으시는 주식이 없나요? 종목 추가 요청하기
                </a>
              </div>
            )}

            {results.map((stock) => (
              <button
                key={stock.ticker}
                type="button"
                onClick={() => handleSelect(stock.ticker)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted-row active:bg-muted-row transition-colors border-b border-line/50 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-xs font-bold shrink-0 text-ink border border-line">
                  {stock.ticker.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{stock.name}</p>
                  <p className="text-xs text-subtle">{stock.ticker}</p>
                </div>
                {stock.annualReturnRate !== null && (
                  <span className={`text-xs font-semibold shrink-0 ${stock.annualReturnRate >= 0 ? "text-accent-up" : "text-accent-down"}`}>
                    {stock.annualReturnRate >= 0 ? "+" : ""}{stock.annualReturnRate.toFixed(1)}%
                  </span>
                )}
                <svg className="w-4 h-4 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}

            {results.length > 0 && (
              <a
                href="/request-stock"
                onClick={() => setOpen(false)}
                className="mt-auto flex items-center gap-2 px-4 py-4 text-xs text-muted border-t border-line hover:bg-muted-row transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                찾으시는 주식이 없나요? 종목 추가 요청하기
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
