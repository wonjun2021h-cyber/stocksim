"use client";

/** 티커마다 고정되는 파스텔~비비드 팔레트 (렌더마다 바뀌지 않음) */
const LOGO_PALETTE = [
  "#E53935",
  "#D81B60",
  "#8E24AA",
  "#5E35B1",
  "#3949AB",
  "#1E88E5",
  "#00897B",
  "#43A047",
  "#7CB342",
  "#F9A825",
  "#FB8C00",
  "#F4511E",
  "#6D4C41",
  "#546E7A",
  "#00838F",
  "#C2185B",
  "#512DA8",
  "#303F9F",
  "#1976D2",
  "#388E3C",
];

function hashTicker(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) {
    h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  }
  return h;
}

function colorsForTicker(ticker: string): { bg: string; text: string } {
  const idx = hashTicker(ticker.toUpperCase()) % LOGO_PALETTE.length;
  return { bg: LOGO_PALETTE[idx], text: "#fff" };
}

interface StockLogoProps {
  ticker: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

export function StockLogo({ ticker, size = "md", className = "" }: StockLogoProps) {
  const colors = colorsForTicker(ticker);
  const label = ticker.replace(/[.-]/g, "").substring(0, 3).toUpperCase();

  return (
    <div
      className={`${SIZE_MAP[size]} rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title={ticker}
    >
      {label}
    </div>
  );
}
