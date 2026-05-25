"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_ITEMS = [
  {
    label: "홈",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
        <path d="M3 12v9h18V12" />
      </svg>
    ),
  },
  {
    label: "주식",
    href: "/stocks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8" />
        <path d="M12 3a14.5 14.5 0 000 18" />
        <path d="M12 3a14.5 14.5 0 010 18" />
      </svg>
    ),
  },
  {
    label: "포트폴리오",
    href: "/backtest",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21.21 15.89A10 10 0 118 2.83" />
        <path d="M22 12A10 10 0 0012 2v10z" />
      </svg>
    ),
  },
  {
    label: "복리",
    href: "/compound",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    label: "뉴스",
    href: "/news",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 4h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        <path d="M4 8h16" />
        <path d="M8 12h8M8 16h5" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-panel border-t border-line safe-area-pb">
      <div className="flex items-center justify-between px-0.5 pt-2 pb-3">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
                isActive ? "text-ink" : "text-subtle"
              }`}
            >
              {icon}
              <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
              {isActive && (
                <span className="absolute -bottom-0 w-1 h-1 rounded-full bg-ink" />
              )}
            </Link>
          );
        })}

        {/* 테마 토글 */}
        <div className="flex flex-col items-center gap-1 px-2 py-1">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
