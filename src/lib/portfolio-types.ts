// ─────────────────────────────────────────────────
// 포트폴리오 백테스팅 서비스 — 핵심 타입 정의
// API 응답 JSON 구조가 UI 컴포넌트에 1:1 매핑되도록 설계
// ─────────────────────────────────────────────────

// ── 입력 ──────────────────────────────────────────

/** 포트폴리오를 구성하는 단일 종목 (최대 10개) */
export interface PortfolioItem {
  ticker: string;    // 예: "TSLA"
  name: string;      // 예: "Tesla"
  weight: number;    // 소수점 포함 비중(%), 합계 = 100
}

/** /api/backtest 엔드포인트에 POST로 전달하는 요청 바디 */
export interface BacktestRequest {
  /** 초기 투자 원금 (원화 KRW, 예: 10_000_000) */
  initialInvestment: number;
  /** 매달 적립식 투자 금액 (원화 KRW, 0이면 일시납) */
  monthlyDCA: number;
  /** 시뮬레이션 기간(년), 1~30 */
  durationYears: number;
  /** 종목 리스트 — 최대 10개, weights 합계가 100이어야 함 */
  items: PortfolioItem[];
}

// ── 시계열 & 시나리오 ─────────────────────────────

/** 누적 자산 곡선의 단일 데이터 포인트 (차트 라이브러리에 바로 꽂는 형태) */
export interface TimeSeriesPoint {
  date: string;   // "YYYY-MM" 형식
  value: number;  // 그 시점의 누적 포트폴리오 가치 (KRW)
}

/** best / median / worst 3개 시나리오 중 하나 */
export interface ScenarioResult {
  label: string;          // "최고 수익 시나리오" 등
  startDate: string;      // 해당 윈도우가 시작된 실제 과거 날짜 "YYYY-MM"
  finalValue: number;     // 최종 포트폴리오 가치 (KRW)
  gainKRW: number;        // 수익금 (KRW)
  gainPct: number;        // 수익률 (%)
  cagr: number;           // 연평균 복리 수익률 (%, 소수 아님)
  /** UI 차트에 꽂을 시계열 배열 */
  curve: TimeSeriesPoint[];
}

// ── 경고 ──────────────────────────────────────────

export type WarningType =
  | "SHORT_HISTORY"    // 12년 미만 데이터 → 상장일부터 계산
  | "NO_DATA"          // 해당 종목 데이터 없음 → 제외됨
  | "WEIGHT_ADJUSTED"; // 데이터 없는 종목 제외 후 비중 재조정

export interface BacktestWarning {
  ticker: string;
  type: WarningType;
  message: string;
  listingDate?: string; // SHORT_HISTORY일 때 실제 상장일
}

// ── API 응답 ──────────────────────────────────────

/**
 * /api/backtest 의 JSON 응답 전체 구조.
 * UI 컴포넌트와의 매핑:
 *   - allocation  → <AllocationDonutChart> + 종목 상세 리스트
 *   - scenarios   → <ScenarioCurveChart>
 *   - meta        → 원금·기간 텍스트 표시
 */
export interface BacktestResponse {
  meta: {
    calculatedAt: string;      // ISO 8601
    initialInvestment: number;
    monthlyDCA: number;
    durationYears: number;
    totalInvested: number;     // 원금 + 월 적립 합계
  };

  /**
   * 도넛 차트 + 종목 리스트에 직접 꽂는 배열.
   * recharts PieChart의 `data` prop 구조와 일치:
   *   [{ ticker, name, weight, value }]
   * - `value`는 도넛 라이브러리 내부 비율 계산용 (= weight)
   * - `weight`는 텍스트 표시용 소수점 비중(%)
   */
  allocation: Array<{
    ticker: string;
    name: string;
    weight: number; // 예: 34.5
    value: number;  // = weight (recharts pie data key)
  }>;

  scenarios: {
    best: ScenarioResult;
    median: ScenarioResult;
    worst: ScenarioResult;
  };

  portfolioMetrics: {
    mdd: number;           // 최대 낙폭 (%, 양수로 표현: 42.3)
    recoveryMonths: number;
    annualizedReturn: {
      best: number;
      median: number;
      worst: number;
    };
  };

  warnings: BacktestWarning[];
}

// ── Supabase DB 매핑 타입 ─────────────────────────

/** user_portfolios 테이블 행 */
export interface DBPortfolio {
  id: string;
  user_id: string;
  name: string;
  initial_investment: number;
  monthly_dca: number;
  created_at: string;
  updated_at: string;
}

/** portfolio_items 테이블 행 */
export interface DBPortfolioItem {
  id: string;
  portfolio_id: string;
  ticker: string;
  name: string;
  weight: number;
  sort_order: number;
}

/** 저장된 포트폴리오 (DB 조인 결과) */
export interface SavedPortfolio extends DBPortfolio {
  items: DBPortfolioItem[];
}

/** 관심 종목 (찜) */
export interface DBFavorite {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  created_at: string;
}

// ── Python 백테스팅 함수 입력 스펙 (주석 문서화) ──
/**
 * Python calculate_portfolio_backtest() 함수 시그니처:
 *
 * def calculate_portfolio_backtest(
 *   tickers: list[str],           # 최대 10개 티커 ["TSLA", "NVDA", ...]
 *   weights: list[float],         # 소수점 포함 비중 [50.0, 34.5, ...]  합계=100
 *   initial_investment: float,    # 초기 원금 (KRW)
 *   monthly_dca: float,           # 월 적립금 (KRW), 0이면 일시납
 *   duration_years: int,          # 시뮬레이션 기간 (년)
 * ) -> dict:                      # BacktestResponse 구조와 동일한 dict 반환
 *
 * 예외 처리:
 *   - 상장 12년 미만 종목: 해당 종목의 priceHistory 시작일부터 자동 계산
 *   - 미국 증시 휴장일(주말·공휴일): forward fill (ffill) 적용
 *   - NaN/None 값: 0으로 처리 후 warnings 배열에 기록
 */
