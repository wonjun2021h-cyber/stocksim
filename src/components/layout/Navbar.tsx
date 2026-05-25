"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HeaderAuth } from "@/components/layout/HeaderAuth";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "주식 전체 보기", href: "/stocks" },
  { label: "포트폴리오 만들기", href: "/backtest" },
  { label: "복리 계산기", href: "/compound" },
  { label: "뉴스", href: "/news" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 items-center gap-8 px-6 py-4 min-w-0">
      <Link href="/" className="text-ink font-bold text-lg tracking-tight shrink-0">
        StockSim
      </Link>

      {/* 데스크톱 전용 네비 링크 */}
      <div className="hidden md:flex items-center gap-6 min-w-0">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center group">
              <span
                className={`text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-ink"
                    : "text-subtle group-hover:text-muted"
                }`}
              >
                {label}
              </span>
              {isActive && (
                <span className="mt-1 w-1 h-1 rounded-full bg-ink" />
              )}
            </Link>
          );
        })}
      </div>

      {/* 데스크톱: 테마 토글 + 로그인 */}
      <div className="ml-auto hidden md:flex items-center gap-2 shrink-0 pl-4">
        <ThemeToggle />
        <HeaderAuth variant="desktop" />
      </div>
    </nav>
  );
}
