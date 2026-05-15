"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stocksim-theme";

function applyTheme(mode: "light" | "dark") {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(STORAGE_KEY, mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
    setMode(resolved);
  }, []);

  const toggle = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  }, [mode]);

  if (!mounted) {
    return (
      <div
        className="h-7 w-[52px] shrink-0 rounded-full bg-muted-row"
        aria-hidden
      />
    );
  }

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={toggle}
      className="relative h-7 w-[52px] shrink-0 rounded-full border border-line bg-panel transition-colors focus-visible:ring-2 focus-visible:ring-line focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      <span
        className={`pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-elevated shadow-sm transition-all duration-200 ease-out ${
          isDark ? "left-1" : "right-1"
        }`}
      >
        {isDark ? (
          <span className="text-[11px]" aria-hidden>
            🌙
          </span>
        ) : (
          <span className="text-[11px]" aria-hidden>
            ☀️
          </span>
        )}
      </span>
    </button>
  );
}
