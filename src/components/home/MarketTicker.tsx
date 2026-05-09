"use client";

import { useState, useEffect } from "react";
import type { MarketData } from "@/lib/types";
import { MarketDataProvider } from "@/lib/api/interface";
import { MarketTickerSkeleton } from "@/components/ui/Skeleton";

interface TickerCardProps {
  label: string;
  value: string;
  change?: string;
  isUp?: boolean;
  icon: React.ReactNode;
}

function TickerCard({ label, value, change, isUp, icon }: TickerCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#333333] px-4 py-3 min-w-[140px] select-none">
      <div className={`shrink-0 ${isUp ? "text-[#ff4d4d]" : "text-[#4da6ff]"}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-[#888] leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-white leading-none">{value}</p>
        {change && (
          <p className={`text-[11px] mt-0.5 ${isUp ? "text-[#ff4d4d]" : "text-[#4da6ff]"}`}>
            {change}
          </p>
        )}
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

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
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
    });
  }, []);

  if (loading || !data) {
    return <MarketTickerSkeleton />;
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <TickerCard
        label="달러 환율"
        value={data.usdKrw.toLocaleString("ko-KR")}
        isUp={false}
        icon={<DownArrowIcon />}
      />
      <TickerCard
        label="나스닥"
        value={data.nasdaq.toLocaleString("ko-KR")}
        isUp={true}
        icon={<UpArrowIcon />}
      />
      <TickerCard
        label="S&P500"
        value={data.sp500.toLocaleString("ko-KR")}
        isUp={true}
        icon={<CheckIcon />}
      />
    </div>
  );
}
