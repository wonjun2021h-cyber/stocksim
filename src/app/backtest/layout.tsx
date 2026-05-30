import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "포트폴리오 만들기 — 백테스트",
  description:
    "최대 10개 미국 주식·ETF로 포트폴리오를 구성하고, 최근 12년 데이터로 최고·평균·최저 시나리오 수익을 시뮬레이션하세요.",
  path: "/backtest",
});

export default function BacktestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
