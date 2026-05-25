"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

/** 홈 검색창 오른쪽 — 로그인 시 마이페이지, 비로그인 시 로그인 유도 */
export function MyPageButton() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return null;

  if (user) {
    return (
      <Link
        href="/mypage"
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-line bg-panel text-ink text-xs font-bold hover:bg-elevated transition-colors active:scale-95"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        마이페이지
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowAuth(true)}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-line bg-panel text-ink text-xs font-bold hover:bg-elevated transition-colors active:scale-95"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        마이페이지
      </button>
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="마이페이지를 이용하려면 로그인이 필요합니다."
        redirectAfterLogin="/mypage"
      />
    </>
  );
}
