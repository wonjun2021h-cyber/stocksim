const AUTH_NEXT_KEY = "stocksim_auth_next";

/** OAuth 후 돌아갈 경로 저장 (콜백 URL에 ?next= 붙이지 않음 → Supabase 허용 목록 매칭 쉬움) */
export function stashAuthNextPath(nextPath: string) {
  if (typeof window === "undefined") return;
  const safe = nextPath.startsWith("/") ? nextPath : "/";
  sessionStorage.setItem(AUTH_NEXT_KEY, safe);
}

/** 콜백 페이지에서 저장된 경로 읽기 */
export function readAuthNextPath(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const stored = sessionStorage.getItem(AUTH_NEXT_KEY);
  sessionStorage.removeItem(AUTH_NEXT_KEY);
  if (stored?.startsWith("/")) return stored;
  return fallback;
}

/** OAuth redirectTo에 쓸 origin — 배포 URL은 현재 접속 origin 우선 */
export function getAuthOrigin(): string {
  if (typeof window === "undefined") return "";

  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const isLocalDev =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.");

  if (isLocalDev) return origin;

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  // Vercel env에 localhost가 잘못 들어간 경우 무시
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  return origin;
}
