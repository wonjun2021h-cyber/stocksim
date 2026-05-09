"use client";

const LOGO_COLORS: Record<string, { bg: string; text: string }> = {
  GOOG: { bg: "#4285F4", text: "#fff" },
  AAPL: { bg: "#555555", text: "#fff" },
  MSFT: { bg: "#00A4EF", text: "#fff" },
  AMZN: { bg: "#FF9900", text: "#fff" },
  META: { bg: "#0866FF", text: "#fff" },
  TSLA: { bg: "#CC0000", text: "#fff" },
  "BRK.A": { bg: "#8B4513", text: "#fff" },
  QQQ: { bg: "#1A1A5E", text: "#fff" },
  SPY: { bg: "#004B87", text: "#fff" },
  VOO: { bg: "#812D2D", text: "#fff" },
  LLY: { bg: "#D52B1E", text: "#fff" },
  NVDA: { bg: "#76B900", text: "#fff" },
  SNDK: { bg: "#E2231A", text: "#fff" },
  AMD: { bg: "#ED1C24", text: "#fff" },
  INTC: { bg: "#0071C5", text: "#fff" },
  MU: { bg: "#C72026", text: "#fff" },
  NFLX: { bg: "#E50914", text: "#fff" },
  COST: { bg: "#005DAA", text: "#fff" },
  SBUX: { bg: "#00704A", text: "#fff" },
};

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
  const colors = LOGO_COLORS[ticker] ?? { bg: "#555", text: "#fff" };
  const label = ticker.replace(".A", "").substring(0, 3);

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
