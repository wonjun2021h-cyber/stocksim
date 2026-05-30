import type { Metadata } from "next";

export const SITE_NAME = "StockSim";
export const DEFAULT_TITLE = "몇 년 전 샀다면, 지금 얼마일까?";
export const DEFAULT_DESCRIPTION =
  "투자 금액·주기·기간을 넣으면 최근 12년 데이터로 시나리오별 수익을 계산해 드립니다. 미국 주식·ETF 시뮬레이션과 포트폴리오 백테스트.";

/** 배포 URL — Vercel 빌드 시 VERCEL_URL, 로컬/설정 시 NEXT_PUBLIC_SITE_URL */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const canonicalPath = options.path ?? "/";
  const url = `${getSiteUrl()}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    ...(options.noIndex
      ? { robots: { index: false, follow: false } }
      : { robots: { index: true, follow: true } }),
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
    },
  };
}

export function buildStockMetadata(stock: {
  ticker: string;
  name: string;
}): Metadata {
  const title = `${stock.name}(${stock.ticker}) — 몇 년 전 샀다면 지금 얼마?`;
  const description = `${stock.name}(${stock.ticker})에 투자했다면 얼마가 됐을까? 금액·기간을 넣어 최근 12년 데이터로 최고·평균·최저 시나리오 수익을 계산해 보세요.`;
  const path = `/stock/${encodeURIComponent(stock.ticker)}`;

  return buildPageMetadata({ title, description, path });
}
