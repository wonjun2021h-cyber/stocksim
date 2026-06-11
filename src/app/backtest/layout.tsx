import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "주식 백테스팅 웹 — 포트폴리오 만들기",
  description:
    "주식 백테스팅 웹에서 최대 10개 미국 주식·ETF 포트폴리오를 구성하고, 최근 12년 데이터로 최고·평균·최저 시나리오 수익을 시뮬레이션하세요.",
  path: "/backtest",
});

export default function BacktestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
