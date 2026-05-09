import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSim — 내 미래 자산을 예측해보세요",
  description:
    "투자 금액, 주기, 기간을 입력하면 최근 12년치 데이터로 미래 자산을 계산해드립니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-[#2a2a2a]">{children}</body>
    </html>
  );
}
