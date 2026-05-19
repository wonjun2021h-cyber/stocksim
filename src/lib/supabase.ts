import { createClient } from "@supabase/supabase-js";
import type { DBPortfolio, DBPortfolioItem } from "@/lib/portfolio-types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

if (
  supabaseUrl === "https://placeholder.supabase.co" ||
  supabaseAnonKey === "placeholder-anon-key"
) {
  if (typeof window !== "undefined") {
    console.warn(
      "[Supabase] 환경변수 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. " +
        ".env.local 파일에 값을 설정해 주세요."
    );
  }
}

/** 클라이언트 컴포넌트 & API 라우트에서 공용으로 사용하는 Supabase 인스턴스 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth helpers ──────────────────────────────────

/** 현재 로그인 세션 반환 (없으면 null) */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Google OAuth 로그인 (리다이렉트 방식) */
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/backtest` },
  });
}

/** Kakao OAuth 로그인 (리다이렉트 방식) */
export async function signInWithKakao() {
  return supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${location.origin}/backtest` },
  });
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
  // 1. user_portfolios 행 삽입 또는 업데이트
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

  // 2. 기존 portfolio_items 삭제 후 재삽입
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

/** 포트폴리오 단건 삭제 */
export async function deletePortfolio(portfolioId: string, userId: string) {
  const { error } = await supabase
    .from("user_portfolios")
    .delete()
    .eq("id", portfolioId)
    .eq("user_id", userId); // RLS 이중 보호

  if (error) throw error;
}
