import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SupabaseLikeError = { message?: string };

/** Supabase/PostgREST 에러 → 화면용 한글 메시지 */
export function formatFeedbackError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return mapMessage(err.message);
  }
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as SupabaseLikeError).message;
    if (typeof msg === "string" && msg) return mapMessage(msg);
  }
  return "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function mapMessage(raw: string): string {
  const msg = raw.toLowerCase();

  if (
    msg.includes("feedbacks") &&
    (msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("schema cache"))
  ) {
    return "feedbacks 테이블이 없습니다. Supabase SQL Editor에서 supabase/feedback_schema.sql을 실행해 주세요.";
  }

  if (msg.includes("column") && msg.includes("content")) {
    return "feedbacks 테이블에 content 컬럼이 필요합니다. SQL Editor에서 feedback_schema.sql을 실행해 주세요.";
  }

  if (msg.includes("service_role") || msg.includes("supabase_service_role")) {
    return raw;
  }

  if (msg.includes("로그인")) return raw;

  return raw;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * 서버 API를 통해 feedbacks 테이블에 저장 (RLS 우회)
 */
async function postFeedback(content: string, requireAuth: boolean): Promise<{ discordSent: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase가 연결되지 않았습니다. .env.local에 URL과 anon key를 넣어 주세요."
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = await getAccessToken();
  if (requireAuth && !token) {
    throw new Error("로그인이 필요합니다.");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify({ content, requireAuth }),
  });

  let data: { error?: string; success?: boolean; discordSent?: boolean } = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(formatFeedbackError(new Error(data.error ?? "전송에 실패했습니다.")));
  }

  return { discordSent: data.discordSent === true };
}

/** 마이페이지 — 불편사항·기능 제안 */
export async function submitUserFeedback(message: string): Promise<{ discordSent: boolean }> {
  const trimmed = message.trim();
  if (trimmed.length < 5) {
    throw new Error("5자 이상 입력해 주세요.");
  }

  return postFeedback(trimmed, true);
}

/** 종목 추가 요청 — 비로그인 가능 */
export async function submitStockRequest(params: {
  ticker: string;
  message?: string;
  contact?: string;
}): Promise<{ discordSent: boolean }> {
  const ticker = params.ticker.trim().toUpperCase();
  if (!ticker) {
    throw new Error("티커를 입력해 주세요.");
  }

  const lines = [`[종목 추가 요청]`, `티커: ${ticker}`];
  if (params.message?.trim()) lines.push(`메모: ${params.message.trim()}`);
  if (params.contact?.trim()) lines.push(`연락처: ${params.contact.trim()}`);

  return postFeedback(lines.join("\n"), false);
}
