"use client";

import { useState, useEffect } from "react";
import type { MarketData, MarketQuote } from "@/lib/types";
import { MarketDataProvider } from "@/lib/api/interface";
import { MarketTickerSkeleton } from "@/components/ui/Skeleton";

interface TickerCardProps {
  label: string;
  quote: MarketQuote;
  formatPrice: (p: number) => string;
}

function TickerCard({ label, quote, formatPrice }: TickerCardProps) {
  const color = quote.isUp ? "text-accent-up" : "text-accent-down";
  const sign = quote.isUp ? "+" : "";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-panel px-4 py-3 min-w-[140px] select-none border border-line dark:border-transparent">
      <div className={`shrink-0 ${color}`}>
        {quote.isUp ? <UpArrowIcon /> : <DownArrowIcon />}
      </div>
      <div>
        <p className="text-[11px] text-subtle leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-ink leading-none">
          {formatPrice(quote.price)}
        </p>
        <p className={`text-[11px] mt-0.5 ${color}`}>
          {sign}{quote.changePercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

const UpArrowIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const DownArrowIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function MarketTicker() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const provider = new MarketDataProvider();
    provider.getMarketData().then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !data) return <MarketTickerSkeleton />;

  return (
    <div className="flex gap-3 flex-wrap">
      <TickerCard
        label="달러 환율"
        quote={data.usdKrw}
        formatPrice={(p) => p.toLocaleString("ko-KR")}
      />
      <TickerCard
        label="나스닥"
        quote={data.nasdaq}
        formatPrice={(p) => p.toLocaleString("ko-KR")}
      />
      <TickerCard
        label="S&P500"
        quote={data.sp500}
        formatPrice={(p) => p.toLocaleString("ko-KR")}
      />
    </div>
  );
}
