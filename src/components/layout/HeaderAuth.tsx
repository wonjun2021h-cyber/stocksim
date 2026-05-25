"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/supabase";

interface HeaderAuthProps {
  variant?: "desktop" | "mobile";
  className?: string;
}

export function HeaderAuth({ variant = "desktop", className = "" }: HeaderAuthProps) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isMobile = variant === "mobile";

  return (
    <>
      {user ? (
        <div className={`relative shrink-0 ${className}`}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className={`flex items-center rounded-full hover:bg-elevated transition-colors ${
              isMobile ? "p-0.5" : "gap-2 px-2 py-1"
            }`}
            aria-label="계정 메뉴"
          >
            <div
              className={`rounded-full bg-ink text-panel flex items-center justify-center font-bold ${
                isMobile ? "w-8 h-8 text-xs" : "w-7 h-7 text-xs"
              }`}
            >
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            {!isMobile && (
              <span className="text-xs text-muted max-w-[110px] truncate">
                {user.email}
              </span>
            )}
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-40 w-44 bg-panel border border-line rounded-2xl shadow-xl overflow-hidden py-1">
                <div className="px-3 py-2 border-b border-line">
                  <p className="text-[11px] text-faint truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setShowMenu(false);
                  }}
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
          type="button"
          onClick={() => setShowAuth(true)}
          className={`shrink-0 rounded-full bg-ink text-panel font-semibold hover:opacity-80 transition-opacity ${
            isMobile
              ? "px-3 py-2 text-xs"
              : "px-3 py-1.5 text-xs"
          } ${className}`}
        >
          로그인
        </button>
      )}

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="포트폴리오를 저장해보세요"
        onSuccess={() => setShowAuth(false)}
      />
    </>
  );
}
