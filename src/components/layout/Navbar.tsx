"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "주식 전체 보기", href: "/stocks" },
  { label: "복리 계산기", href: "/compound" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-8 px-6 py-4">
      <Link href="/" className="text-ink font-bold text-lg tracking-tight">
        StockSim
      </Link>
      <div className="flex items-center gap-6">
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
    </nav>
  );
}
