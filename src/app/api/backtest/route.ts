/**
 * POST /api/backtest
 *
 * 포트폴리오 백테스팅 API 엔드포인트.
 * 요청: BacktestRequest (JSON body)
 * 응답: BacktestResponse (JSON)
 *
 * 예시 요청:
 * {
 *   "initialInvestment": 10000000,
 *   "monthlyDCA": 300000,
 *   "durationYears": 10,
 *   "items": [
 *     { "ticker": "TSLA", "name": "Tesla",  "weight": 50.0 },
 *     { "ticker": "NVDA", "name": "NVIDIA", "weight": 34.5 },
 *     { "ticker": "AAPL", "name": "Apple",  "weight": 15.5 }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { BacktestRequest } from "@/lib/portfolio-types";
import { runPortfolioBacktest } from "@/lib/portfolio-simulation";
import type { StockDataPoint } from "@/lib/types";

// ── 타입 ─────────────────────────────────────────────────

interface StockJsonFile {
  ticker: string;
  name: string;
  history: StockDataPoint[];
}

// ── 서버사이드 파일 로더 ─────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "public", "data", "stocks");

/**
 * public/data/stocks/{TICKER}.json 를 직접 읽습니다.
 * 클라이언트에서 fetch 대신 fs.readFileSync 사용 (서버 전용).
 */
function loadStockFromDisk(ticker: string): StockJsonFile | null {
  const filePath = path.join(DATA_DIR, `${ticker.toUpperCase()}.json`);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as StockJsonFile;
  } catch {
    return null;
  }
}

// ── 입력 유효성 검사 ──────────────────────────────────────

function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: BacktestRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "요청 본문이 없습니다." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.initialInvestment !== "number" || b.initialInvestment < 0) {
    return { valid: false, error: "initialInvestment는 0 이상의 숫자여야 합니다." };
  }
  if (typeof b.monthlyDCA !== "number" || b.monthlyDCA < 0) {
    return { valid: false, error: "monthlyDCA는 0 이상의 숫자여야 합니다." };
  }
  if (typeof b.durationYears !== "number" || b.durationYears < 1 || b.durationYears > 30) {
    return { valid: false, error: "durationYears는 1~30 사이여야 합니다." };
  }
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 10) {
    return { valid: false, error: "items는 1~10개 사이여야 합니다." };
  }

  for (const item of b.items as unknown[]) {
    if (!item || typeof item !== "object") {
      return { valid: false, error: "각 item은 객체여야 합니다." };
    }
    const it = item as Record<string, unknown>;
    if (typeof it.ticker !== "string" || !it.ticker.trim()) {
      return { valid: false, error: "각 item.ticker는 문자열이어야 합니다." };
    }
    if (typeof it.weight !== "number" || it.weight <= 0 || it.weight > 100) {
      return { valid: false, error: `${it.ticker}: weight는 0 초과 100 이하여야 합니다.` };
    }
  }

  // 비중 합계 검사 (100 ± 1 허용)
  const totalWeight = (b.items as Array<{ weight: number }>).reduce(
    (sum, it) => sum + it.weight,
    0
  );
  if (Math.abs(totalWeight - 100) > 1) {
    return { valid: false, error: `비중의 합계는 100이어야 합니다. (현재: ${totalWeight.toFixed(2)})` };
  }

  return { valid: true, data: b as unknown as BacktestRequest };
}

// ── 핸들러 ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { valid, error, data } = validateRequest(body);

    if (!valid || !data) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // 종목별 주가 데이터 로드 (서버 파일시스템)
    const stockDataMap = new Map<
      string,
      { name: string; history: StockDataPoint[] }
    >();

    for (const item of data.items) {
      const ticker = item.ticker.toUpperCase();
      const stockFile = loadStockFromDisk(ticker);

      if (stockFile) {
        stockDataMap.set(ticker, {
          name: stockFile.name || item.name,
          history: stockFile.history,
        });
      }
      // 데이터 없으면 runPortfolioBacktest 내부에서 NO_DATA 경고 처리
    }

    // 백테스팅 실행
    const result = runPortfolioBacktest({ request: data, stockDataMap });

    return NextResponse.json(result, {
      headers: {
        // 30초간 엣지 캐시 (같은 요청 중복 방지)
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[POST /api/backtest] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}

// GET 요청: API 구조 설명 반환
export function GET() {
  return NextResponse.json({
    description: "포트폴리오 백테스팅 API",
    method: "POST",
    body: {
      initialInvestment: "number (KRW, 초기 원금)",
      monthlyDCA: "number (KRW, 월 적립금, 0=일시납)",
      durationYears: "number (1-30, 시뮬레이션 기간)",
      items: [
        {
          ticker: "string (예: TSLA)",
          name: "string (예: Tesla)",
          weight: "number (비중%, 소수점 포함, 합계=100)",
        },
      ],
    },
  });
}
