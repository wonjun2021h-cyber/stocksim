"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

const iconClass =
  "shrink-0 flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-full border border-line bg-panel text-ink text-xs font-bold hover:bg-elevated transition-colors active:scale-95";

const profileIcon = (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

/** 홈 검색창 오른쪽 — 로그인 시 마이페이지, 비로그인 시 로그인 유도 */
export function MyPageButton() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return null;

  if (user) {
    return (
      <Link href="/mypage" className={iconClass} aria-label="마이페이지">
        {profileIcon}
        <span className="hidden sm:inline">마이페이지</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowAuth(true)}
        className={iconClass}
        aria-label="마이페이지 로그인"
      >
        {profileIcon}
        <span className="hidden sm:inline">마이페이지</span>
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
