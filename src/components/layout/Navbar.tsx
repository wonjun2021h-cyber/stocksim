"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/supabase";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "주식 전체 보기", href: "/stocks" },
  { label: "포트폴리오 만들기", href: "/backtest" },
  { label: "복리 계산기", href: "/compound" },
  { label: "뉴스", href: "/news" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 rounded-full hover:bg-elevated transition-colors px-2 py-1"
            >
              <div className="w-7 h-7 rounded-full bg-ink text-panel flex items-center justify-center text-xs font-bold">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-xs text-muted max-w-[110px] truncate">
                {user.email}
              </span>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-44 bg-panel border border-line rounded-2xl shadow-xl overflow-hidden py-1">
                  <div className="px-3 py-2 border-b border-line">
                    <p className="text-[11px] text-faint truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={async () => { await signOut(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-danger-text hover:bg-elevated transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="px-3 py-1.5 rounded-full bg-ink text-panel text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            로그인
          </button>
        )}
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason=""
        onSuccess={() => setShowAuth(false)}
      />
    </nav>
  );
}
