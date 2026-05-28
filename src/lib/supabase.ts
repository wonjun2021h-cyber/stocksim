import { createBrowserClient } from "@supabase/ssr";
import type { DBPortfolio, DBPortfolioItem, DBFavorite } from "@/lib/portfolio-types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

/** .env.local에 실제 Supabase 값이 들어갔는지 */
export function isSupabaseConfigured(): boolean {
  const placeholderHosts = [
    "placeholder.supabase.co",
    "your-project-ref.supabase.co",
    "your_project_id.supabase.co",
    "YOUR_PROJECT_ID.supabase.co",
  ];
  const isPlaceholderUrl = placeholderHosts.some((h) => supabaseUrl.includes(h));
  return (
    !isPlaceholderUrl &&
    supabaseAnonKey !== "placeholder-anon-key" &&
    !supabaseAnonKey.startsWith("your-anon-key") &&
    supabaseUrl.includes("supabase.co")
  );
}

if (!isSupabaseConfigured() && typeof window !== "undefined") {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. " +
      ".env.example 을 복사해 .env.local 을 만들고 값을 채워 주세요."
  );
}

/** 브라우저용 Supabase (OAuth PKCE는 쿠키에 저장 — @supabase/ssr) */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/** OAuth 완료 후 돌아올 URL (Supabase 대시보드 Redirect URLs에도 등록 필요) */
export function getAuthCallbackUrl(nextPath = "/") {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

// ── Auth helpers ──────────────────────────────────

/** 현재 로그인 세션 반환 (없으면 null) */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function signInWithOAuthProvider(
  provider: "google" | "kakao",
  nextPath?: string
) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase가 연결되지 않았습니다. 프로젝트 루트에 .env.local 파일을 만들고 URL·anon key를 넣어 주세요."
    );
  }

  const next =
    nextPath ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthCallbackUrl(next),
    },
  });

  if (error) throw error;
  return data;
}

/** Google OAuth 로그인 (리다이렉트 방식 — exchange external code 오류 시 비권장) */
export async function signInWithGoogle(nextPath?: string) {
  return signInWithOAuthProvider("google", nextPath);
}

/**
 * Google ID 토큰 로그인 — Supabase↔Google 코드 교환을 거치지 않음.
 * `Unable to exchange external code` 우회용.
 */
export async function signInWithGoogleIdToken(credential: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase가 연결되지 않았습니다.");
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  });
  if (error) throw error;
  return data;
}

/** Kakao OAuth 로그인 */
export async function signInWithKakao(nextPath?: string) {
  return signInWithOAuthProvider("kakao", nextPath);
}

/** 로그아웃 */
export async function signOut() {
  return supabase.auth.signOut();
}

// ── Portfolio DB helpers ──────────────────────────

/**
 * 로그인 유저의 포트폴리오 목록 + 종목 항목을 한 번에 가져옵니다.
 */
export async function fetchUserPortfolios(userId: string) {
  const { data, error } = await supabase
    .from("user_portfolios")
    .select(`
      *,
      portfolio_items (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as (DBPortfolio & { portfolio_items: DBPortfolioItem[] })[];
}

/**
 * 포트폴리오와 종목 항목을 저장합니다 (트랜잭션 대신 순차 삽입).
 * 이미 같은 이름이 있으면 upsert 처리합니다.
 */
export async function savePortfolio(
  userId: string,
  name: string,
  initialInvestment: number,
  monthlyDCA: number,
  items: Array<{ ticker: string; name: string; weight: number }>
) {
  const { data: portfolio, error: pfError } = await supabase
    .from("user_portfolios")
    .upsert(
      {
        user_id: userId,
        name,
        initial_investment: initialInvestment,
        monthly_dca: monthlyDCA,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" }
    )
    .select()
    .single();

  if (pfError) throw pfError;

  await supabase
    .from("portfolio_items")
    .delete()
    .eq("portfolio_id", portfolio.id);

  const itemRows = items.map((item, idx) => ({
    portfolio_id: portfolio.id,
    ticker: item.ticker,
    name: item.name,
    weight: item.weight,
    sort_order: idx,
  }));

  const { error: itemError } = await supabase
    .from("portfolio_items")
    .insert(itemRows);

  if (itemError) throw itemError;

  return portfolio as DBPortfolio;
}

/** 포트폴리오 이름 변경 */
export async function renamePortfolio(portfolioId: string, userId: string, newName: string) {
  const { error } = await supabase
    .from("user_portfolios")
    .update({ name: newName.trim(), updated_at: new Date().toISOString() })
    .eq("id", portfolioId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 포트폴리오 단건 삭제 */
export async function deletePortfolio(portfolioId: string, userId: string) {
  const { error } = await supabase
    .from("user_portfolios")
    .delete()
    .eq("id", portfolioId)
    .eq("user_id", userId);

  if (error) throw error;
}

// ── Favorites DB helpers ──────────────────────────

/** 로그인 유저의 관심 종목 목록 */
export async function fetchUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DBFavorite[];
}

/** 관심 종목 추가 */
export async function addFavorite(userId: string, ticker: string, name: string) {
  const { data, error } = await supabase
    .from("user_favorites")
    .insert({
      user_id: userId,
      ticker: ticker.toUpperCase(),
      name,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DBFavorite;
}

/** 관심 종목 해제 */
export async function removeFavorite(userId: string, ticker: string) {
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("ticker", ticker.toUpperCase());

  if (error) throw error;
}
