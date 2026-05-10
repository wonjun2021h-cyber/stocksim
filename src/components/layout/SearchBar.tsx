"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { StockInfo } from "@/lib/types";

interface SearchBarProps {
  placeholder?: string;
  stocks: StockInfo[];
  className?: string;
  variant?: "navbar" | "inline";
}

export function SearchBar({
  placeholder = "주식 검색하기",
  stocks,
  className = "",
  variant = "navbar",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<StockInfo[]>([]);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = stocks
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q)
      )
      .slice(0, 6);
    setResults(filtered);
  }, [query, stocks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(ticker: string) {
    setQuery("");
    setFocused(false);
    router.push(`/stock/${ticker}`);
  }

  const showDropdown = focused && results.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200 border ${
          focused
            ? "bg-elevated border-ring shadow-md dark:border-ring dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            : "bg-panel border-transparent"
        } ${variant === "navbar" ? "w-48 focus-within:w-64" : "w-full"}`}
        style={{ transition: "width 0.2s ease, box-shadow 0.2s ease" }}
      >
        <svg
          className="w-4 h-4 text-subtle shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="bg-transparent outline-none text-sm text-ink placeholder:text-faint w-full"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-faint hover:text-muted transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full min-w-[240px] rounded-xl bg-panel border border-line shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50">
          {results.map((stock) => (
            <button
              key={stock.ticker}
              type="button"
              onClick={() => handleSelect(stock.ticker)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted-row transition-colors text-left"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-ring text-ink"
              >
                {stock.ticker.substring(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{stock.name}</p>
                <p className="text-xs text-subtle">{stock.ticker}</p>
              </div>
              {stock.hasInsufficientData ? (
                <span className="ml-auto text-xs font-medium text-accent-warn">
                  데이터 부족
                </span>
              ) : stock.annualReturnRate !== null && (
                <span
                  className={`ml-auto text-xs font-medium ${
                    stock.annualReturnRate >= 0
                      ? "text-accent-up"
                      : "text-accent-down"
                  }`}
                >
                  {stock.hasPeriodMismatchWarning ? "⚠️ " : ""}
                  {stock.annualReturnRate >= 0 ? "+" : ""}
                  {stock.annualReturnRate.toFixed(1)}% CAGR (
                  {Math.round((stock.annualReturnPeriodYears ?? 0) * 10) / 10}년 기준)
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
