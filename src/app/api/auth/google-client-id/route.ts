import { NextResponse } from "next/server";

/** Supabase Google OAuth URL에서 Client ID 자동 추출 (env 없어도 동작) */
export async function GET() {
  const fromEnv =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (fromEnv?.includes(".apps.googleusercontent.com")) {
    return NextResponse.json({ clientId: fromEnv.trim() });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl?.includes("supabase.co") || !anonKey) {
    return NextResponse.json({ clientId: null }, { status: 503 });
  }

  try {
    const redirectTo = encodeURIComponent(
      "http://localhost:3000/auth/callback"
    );
    const res = await fetch(
      `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        redirect: "manual",
        cache: "no-store",
      }
    );

    const location = res.headers.get("location") ?? "";
    const match = location.match(/[?&]client_id=([^&]+)/);
    if (match?.[1]) {
      return NextResponse.json({
        clientId: decodeURIComponent(match[1]),
      });
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ clientId: null }, { status: 503 });
}
