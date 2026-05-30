import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { findStockByTicker } from "@/lib/stock-index-server";

type Props = {
  params: Promise<{ ticker: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const stock = findStockByTicker(ticker);
  const label = stock ? `${stock.name}(${stock.ticker})` : decodeURIComponent(ticker).toUpperCase();

  return buildPageMetadata({
    title: `${label} 시뮬 결과`,
    description: `${label} 투자 시뮬레이션 결과입니다. 참고용이며 투자 권유가 아닙니다.`,
    path: `/stock/${encodeURIComponent(stock?.ticker ?? ticker)}/result`,
    noIndex: true,
  });
}

export default function StockResultLayout({ children }: Props) {
  return children;
}
