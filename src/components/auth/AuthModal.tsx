"use client";

import { useState } from "react";
import { signInWithGoogle, signInWithKakao } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 로그인 성공 후 이어서 실행할 동작 (예: 저장하기) */
  onSuccess?: () => void;
  /** 모달 제목 맥락 (예: "포트폴리오를 저장하려면 로그인이 필요합니다") */
  reason?: string;
}

/**
 * 소셜 로그인 모달.
 *
 * [비로그인 유저 동선]
 * - '저장하기' 버튼 클릭 시 이 모달을 열어줍니다.
 * - 로그인 완료 후 onSuccess 콜백으로 원래 작업을 이어서 실행합니다.
 *
 * 사용 예:
 *   const [showAuth, setShowAuth] = useState(false);
 *
 *   // '저장하기' 클릭 핸들러
 *   function handleSave() {
 *     if (!user) {
 *       setShowAuth(true); // 비로그인 → 로그인 팝업 표시
 *       return;
 *     }
 *     // 로그인 유저 → 바로 저장 로직 실행
 *     await savePortfolio(...);
 *   }
 */
export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  reason = "포트폴리오를 저장하려면 로그인이 필요합니다.",
}: AuthModalProps) {
  const [loading, setLoading] = useState<"google" | "kakao" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGoogle() {
    try {
      setLoading("google");
      setError(null);
      await signInWithGoogle();
      onSuccess?.();
    } catch {
      setError("Google 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function handleKakao() {
    try {
      setLoading("kakao");
      setError(null);
      await signInWithKakao();
      onSuccess?.();
    } catch {
      setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(null);
    }
  }

  return (
    // 딤 오버레이
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 모달 본체 */}
      <div className="w-full sm:max-w-sm bg-panel rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0 pr-2">
            <h2 className="text-lg font-bold text-ink shrink-0">로그인</h2>
            {reason ? (
              <p className="text-sm text-muted leading-snug">{reason}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-muted transition-colors p-1 -mt-1 -mr-1"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* 로그인 버튼들 */}
        <div className="flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={!!loading}
            className="flex items-center justify-center gap-3 w-full rounded-2xl border border-line bg-panel hover:bg-elevated py-3.5 text-sm font-semibold text-ink transition-colors disabled:opacity-60 active:scale-[0.98]"
          >
            {loading === "google" ? (
              <span className="w-5 h-5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.3H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.4 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.7z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.4 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.8 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.3H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.6 5.6C37.3 40 44 35 44 24c0-1.3-.1-2.5-.4-3.7z"/>
              </svg>
            )}
            Google로 계속하기
          </button>

          {/* Kakao */}
          <button
            onClick={handleKakao}
            disabled={!!loading}
            className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#FEE500] hover:bg-[#F5DC00] py-3.5 text-sm font-semibold text-[#191919] transition-colors disabled:opacity-60 active:scale-[0.98]"
          >
            {loading === "kakao" ? (
              <span className="w-5 h-5 rounded-full border-2 border-[#191919]/30 border-t-[#191919] animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.2 4.5 6.7l-.9 3.3 3.8-2.5c.8.1 1.7.2 2.6.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
              </svg>
            )}
            카카오로 계속하기
          </button>
        </div>

        <p className="text-center text-xs text-subtle">
          로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
