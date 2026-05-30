"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { signInWithGoogle, signInWithGoogleIdToken } from "@/lib/supabase";
import { AUTH_ERROR_USER_MESSAGE } from "@/lib/authMessages";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError: (message: string) => void;
  redirectAfterLogin?: string;
}

/** Google ID 토큰 로그인 — 페이지 이동 없이 PC·모바일 동일 동작 */
export function GoogleSignInButton({
  onSuccess,
  onError,
  redirectAfterLogin,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [useOAuthFallback, setUseOAuthFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/google-client-id")
      .then((r) => r.json())
      .then((d: { clientId?: string | null }) => {
        if (d.clientId) setClientId(d.clientId);
        else setUseOAuthFallback(true);
      })
      .catch(() => setUseOAuthFallback(true));
  }, []);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        setLoading(true);
        await signInWithGoogleIdToken(response.credential);
        onSuccess?.();
        if (redirectAfterLogin) {
          window.location.href = redirectAfterLogin;
        } else {
          window.location.reload();
        }
      } catch {
        onError(AUTH_ERROR_USER_MESSAGE);
        setLoading(false);
      }
    },
    [onSuccess, onError, redirectAfterLogin]
  );

  useEffect(() => {
    if (
      !clientId ||
      !gsiReady ||
      !buttonRef.current ||
      initializedRef.current ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    initializedRef.current = true;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      auto_select: false,
    });

    const width = Math.max(buttonRef.current.offsetWidth, 280);
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width,
      text: "continue_with",
      locale: "ko",
      shape: "pill",
    });
  }, [clientId, gsiReady, handleCredential]);

  async function handleOAuthFallback() {
    try {
      setLoading(true);
      const next =
        redirectAfterLogin ??
        (typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/");
      await signInWithGoogle(next);
    } catch {
      onError(AUTH_ERROR_USER_MESSAGE);
      setLoading(false);
    }
  }

  if (useOAuthFallback) {
    return (
      <button
        type="button"
        onClick={handleOAuthFallback}
        disabled={loading}
        className="flex items-center justify-center gap-3 w-full rounded-2xl border border-line bg-panel hover:bg-elevated py-3.5 text-sm font-semibold text-ink transition-colors disabled:opacity-60 active:scale-[0.98]"
      >
        {loading ? (
          <span className="w-5 h-5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.3H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.4 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.7z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.4 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.8 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.3H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.6 5.6C37.3 40 44 35 44 24c0-1.3-.1-2.5-.4-3.7z" />
          </svg>
        )}
        Google로 계속하기
      </button>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiReady(true)}
      />
      <div
        ref={buttonRef}
        className={`w-full min-h-[44px] flex items-center justify-center ${
          loading ? "opacity-60 pointer-events-none" : ""
        }`}
      />
    </>
  );
}
