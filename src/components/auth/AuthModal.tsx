"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reason?: string;
  redirectAfterLogin?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  reason = "포트폴리오를 저장하려면 로그인이 필요합니다.",
  redirectAfterLogin,
}: AuthModalProps) {
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-panel rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
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

        {error && (
          <p className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {configured ? (
          <GoogleSignInButton
            redirectAfterLogin={redirectAfterLogin}
            onSuccess={() => {
              onSuccess?.();
              onClose();
            }}
            onError={setError}
          />
        ) : (
          <p className="text-sm text-muted text-center py-2">
            로그인을 준비 중입니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        <p className="text-center text-xs text-subtle">
          로그인 시 이용약관 및 개인정보처리방침에 동의합니다.
        </p>
      </div>
    </div>
  );
}
