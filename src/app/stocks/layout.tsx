import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "주식 전체 보기",
  description:
    "StockSim에서 지원하는 미국 주식·ETF 종목 목록. 종목별 연평균 수익률(CAGR)과 시뮬레이션 페이지로 바로 이동할 수 있습니다.",
  path: "/stocks",
});

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
