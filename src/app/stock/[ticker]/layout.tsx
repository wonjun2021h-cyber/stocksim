import type { Metadata } from "next";
import { buildPageMetadata, buildStockMetadata } from "@/lib/seo";
import { findStockByTicker } from "@/lib/stock-index-server";

type Props = {
  params: Promise<{ ticker: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const stock = findStockByTicker(ticker);

  if (stock) {
    return buildStockMetadata(stock);
  }

  const upper = decodeURIComponent(ticker).toUpperCase();
  return buildPageMetadata({
    title: `${upper} 주식 시뮬레이션`,
    description: `${upper} 종목에 투자했다면 얼마가 됐을까? StockSim에서 시나리오별 수익을 계산해 보세요.`,
    path: `/stock/${encodeURIComponent(upper)}`,
  });
}

export default function StockTickerLayout({ children }: Props) {
  return children;
}
