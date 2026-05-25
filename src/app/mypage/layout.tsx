import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마이페이지 — StockSim",
  description: "저장한 포트폴리오와 서비스 의견을 관리합니다.",
};

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
