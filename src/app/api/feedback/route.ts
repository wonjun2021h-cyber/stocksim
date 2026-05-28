/**
 * POST /api/feedback — 의견·종목 요청 → feedbacks.content
 */

import { NextRequest, NextResponse } from "next/server";
import { formatFeedbackDiscordMessage, sendDiscordNotification } from "@/lib/discord";
import { getFeedbackClient, getUserFromRequest } from "@/lib/supabase-server";
function mapInsertError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("content") && lower.includes("does not exist")) {
    return (
      "feedbacks 테이블에 content 컬럼이 없습니다. Supabase SQL Editor에서 supabase/fix-feedbacks.sql 파일 내용을 실행해 주세요."
    );
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return "저장 권한(RLS) 문제입니다. supabase/fix-feedbacks.sql을 Supabase SQL Editor에서 실행해 주세요.";
  }
  return message;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { content?: string; requireAuth?: boolean };
    const content = body.content?.trim() ?? "";

    if (content.length < 1) {
      return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
    }

    const user = await getUserFromRequest(req);
    if (body.requireAuth && !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const sb = getFeedbackClient(req);
    const { error } = await sb.from("feedbacks").insert({
      content,
      user_id: user?.id ?? null,
    });

    if (error) {
      console.error("[POST /api/feedback]", error);
      return NextResponse.json({ error: mapInsertError(error.message) }, { status: 500 });
    }

    const { title, body: discordBody } = formatFeedbackDiscordMessage(
      content,
      user?.email ?? null
    );
    const discordSent = await sendDiscordNotification(title, discordBody);
    if (!discordSent) {
      console.warn("[POST /api/feedback] Discord 알림 미전송 — .env.local의 DISCORD_WEBHOOK_URL 확인");
    }

    return NextResponse.json({ success: true, discordSent });
  } catch (err) {
    console.error("[POST /api/feedback]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류" },
      { status: 500 }
    );
  }
}
