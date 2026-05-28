import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.");
  return key;
}

export function isValidServiceRoleKey(key?: string | null): boolean {
  if (!key) return false;
  if (key.includes("your-service")) return false;
  if (key.length < 40) return false;
  return true;
}

/** service role (RLS 우회) — 키가 유효할 때만 */
export function getServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isValidServiceRoleKey(key)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY가 없거나 placeholder입니다. Supabase > Settings > API > service_role key를 .env.local에 넣어 주세요."
    );
  }
  return createClient(getSupabaseUrl(), key!);
}

export function isServiceRoleConfigured(): boolean {
  return isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** anon key + (선택) 유저 JWT — RLS 정책 따름 */
export function getAnonClient(userAccessToken?: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    global: userAccessToken
      ? { headers: { Authorization: `Bearer ${userAccessToken}` } }
      : {},
  });
}

/** 피드백 insert용 클라이언트 (service role 우선, 없으면 anon) */
export function getFeedbackClient(req: NextRequest): SupabaseClient {
  const authHeader = req.headers.get("authorization");
  const userToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return getServiceClient();
  }

  return getAnonClient(userToken);
}

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const sb = isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? getServiceClient()
    : getAnonClient(token);

  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}
