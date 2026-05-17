import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "StockSim — 내 미래 자산을 예측해보세요",
  description:
    "투자 금액, 주기, 기간을 입력하면 최근 12년치 데이터로 미래 자산을 계산해드립니다",
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
        {children}
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
