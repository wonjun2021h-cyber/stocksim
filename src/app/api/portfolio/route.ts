/**
 * /api/portfolio — 포트폴리오 저장 / 불러오기 API
 *
 * GET  /api/portfolio          → 로그인 유저의 포트폴리오 목록 반환
 * POST /api/portfolio          → 포트폴리오 저장 (upsert)
 * DELETE /api/portfolio?id=... → 포트폴리오 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** 서비스 역할 클라이언트를 요청 시점에 생성 (빌드 타임 env 없음 대응) */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다."
    );
  }
  return createClient(url, key);
}

/** 요청 헤더에서 Bearer 토큰을 추출해 유저 정보를 가져옵니다. */
async function getUserFromRequest(req: NextRequest) {
  const sb = getServiceClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}

// ── GET: 포트폴리오 목록 ──────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from("user_portfolios")
      .select(`*, portfolio_items(*)`)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류" },
      { status: 500 }
    );
  }
}

// ── POST: 포트폴리오 저장 ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { name, initialInvestment, monthlyDCA, items } = body;

    if (!name || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 });
    }

    const sb = getServiceClient();

    // upsert: user_id + name 조합이 같으면 업데이트
    const { data: portfolio, error: pfError } = await sb
      .from("user_portfolios")
      .upsert(
        {
          user_id: user.id,
          name,
          initial_investment: initialInvestment ?? 0,
          monthly_dca: monthlyDCA ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,name" }
      )
      .select()
      .single();

    if (pfError) {
      return NextResponse.json({ error: pfError.message }, { status: 500 });
    }

    // 기존 항목 삭제 후 재삽입
    await sb.from("portfolio_items").delete().eq("portfolio_id", portfolio.id);

    const itemRows = items.map(
      (item: { ticker: string; name: string; weight: number }, idx: number) => ({
        portfolio_id: portfolio.id,
        ticker: item.ticker,
        name: item.name,
        weight: item.weight,
        sort_order: idx,
      })
    );

    const { error: itemError } = await sb.from("portfolio_items").insert(itemRows);

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, portfolioId: portfolio.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류" },
      { status: 500 }
    );
  }
}

// ── DELETE: 포트폴리오 삭제 ───────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "포트폴리오 ID가 필요합니다." }, { status: 400 });
    }

    const sb = getServiceClient();
    const { error } = await sb
      .from("user_portfolios")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // 본인 것만 삭제

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류" },
      { status: 500 }
    );
  }
}
