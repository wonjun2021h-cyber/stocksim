import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "주식 뉴스",
  description: "미국 주식·시장 관련 뉴스를 모아 봅니다.",
  path: "/news",
});

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
