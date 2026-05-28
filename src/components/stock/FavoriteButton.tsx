"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { AuthModal } from "@/components/auth/AuthModal";

interface FavoriteButtonProps {
  ticker: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function FavoriteButton({
  ticker,
  name,
  size = "md",
  className = "",
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showAuth, setShowAuth] = useState(false);
  const [pending, setPending] = useState(false);

  const active = isFavorite(ticker);
  const btnSize = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuth(true);
      return;
    }

    setPending(true);
    try {
      await toggleFavorite(ticker, name);
    } catch {
      alert("관심 종목 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={active ? "관심 종목 해제" : "관심 종목 추가"}
        aria-pressed={active}
        className={`${btnSize} flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-elevated disabled:opacity-50 ${className}`}
      >
        <svg
          className={`${iconSize} transition-colors ${active ? "text-red-500" : "text-faint"}`}
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </button>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="관심 종목을 저장하려면 로그인이 필요합니다."
        redirectAfterLogin={
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/"
        }
      />
    </>
  );
}
