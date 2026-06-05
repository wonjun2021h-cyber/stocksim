import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${DEFAULT_TITLE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "주식 시뮬레이션",
    "미국 주식",
    "백테스트",
    "포트폴리오",
    "투자 계산기",
    "CAGR",
    "적립식 투자",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  robots: { index: true, follow: true },
  verification: {
    google: "doyMLybXD73eXgLy6-0gsMW2ofrn2LHgbLHylOOusyY",
  },
  other: {
    "google-adsense-account": "ca-pub-6924141967925483",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${DEFAULT_TITLE}`,
    description: DEFAULT_DESCRIPTION,
    url: getSiteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${DEFAULT_TITLE}`,
    description: DEFAULT_DESCRIPTION,
  },
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6924141967925483"
          crossOrigin="anonymous"
        />
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
