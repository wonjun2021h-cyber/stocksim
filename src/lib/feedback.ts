import { supabase } from "@/lib/supabase";

/** 로그인 유저 의견 제출 */
export async function submitUserFeedback(message: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("user_feedback").insert({
    user_id: user.id,
    message: message.trim(),
  });

  if (error) throw error;
}

/** 종목 추가 요청 (비로그인 가능) */
export async function submitStockRequest(params: {
  ticker: string;
  message?: string;
  contact?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.from("stock_requests").insert({
    user_id: userId,
    ticker: params.ticker.trim().toUpperCase(),
    message: params.message?.trim() || null,
    contact: params.contact?.trim() || null,
  });

  if (error) throw error;
}
