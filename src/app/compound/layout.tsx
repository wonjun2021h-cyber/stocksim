import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "복리 계산기",
  description:
    "원금·연이율·기간을 입력해 복리 수익을 계산합니다. 장기 투자 시 자산이 어떻게 불어나는지 확인해 보세요.",
  path: "/compound",
});

export default function CompoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
