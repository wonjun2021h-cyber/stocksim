import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppProviders } from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "StockSim — 몇 년 전 샀다면, 지금 얼마일까?",
  description:
    "투자 금액·주기·기간을 넣으면 최근 12년 데이터로 시나리오별 수익을 계산해 드립니다",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('stocksim-theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.remove('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/* pb-16 = 모바일 바텀 내비 높이 확보, md:pb-0 = 데스크톱에서 제거 */}
      <body className="antialiased min-h-screen bg-page text-ink flex flex-col pb-16 md:pb-0">
        <AppProviders>{children}</AppProviders>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
