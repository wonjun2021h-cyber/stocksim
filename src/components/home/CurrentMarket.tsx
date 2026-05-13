"use client";

import { useState, useEffect } from "react";
import type { MarketQuote } from "@/lib/types";

interface QuoteItem {
  label: string;
  quote: MarketQuote;
  formatPrice: (p: number) => string;
}

interface ApiResponse {
  nasdaq: MarketQuote;
  sp500: MarketQuote;
  usdKrw: MarketQuote;
}

function MiniQuote({ label, quote, formatPrice }: QuoteItem) {
  const isUp = quote.isUp;
  const color = isUp ? "text-accent-up" : "text-accent-down";
  const sign = isUp ? "+" : "";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-faint">{label}</span>
      <span className="text-sm font-bold text-ink tabular-nums">
        {formatPrice(quote.price)}
      </span>
      <span className={`flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
        {isUp ? (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 7.5 6 4.5 3 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {sign}{quote.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex items-center gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="h-2.5 w-12 bg-elevated rounded animate-pulse" />
          <div className="h-4 w-16 bg-elevated rounded animate-pulse" />
          <div className="h-2.5 w-10 bg-elevated rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function CurrentMarket() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    fetch("/api/market", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData(d);
        setLastUpdated(
          new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
          Current Market
        </span>
        {lastUpdated && (
          <span className="text-[10px] text-faint">{lastUpdated} 기준</span>
        )}
      </div>

      <div className="bg-panel rounded-xl border border-line px-4 py-3">
        {loading ? (
          <Skeleton />
        ) : !data ? (
          <span className="text-xs text-faint">데이터를 불러올 수 없습니다</span>
        ) : (
          <div className="flex items-center gap-6">
            <MiniQuote
              label="나스닥"
              quote={data.nasdaq}
              formatPrice={(p) => p.toLocaleString("ko-KR")}
            />
            <div className="w-px h-8 bg-line" />
            <MiniQuote
              label="S&P 500"
              quote={data.sp500}
              formatPrice={(p) => p.toLocaleString("ko-KR")}
            />
            <div className="w-px h-8 bg-line" />
            <MiniQuote
              label="원/달러"
              quote={data.usdKrw}
              formatPrice={(p) => `${p.toLocaleString("ko-KR")}원`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
