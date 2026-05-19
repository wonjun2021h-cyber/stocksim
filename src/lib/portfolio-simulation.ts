/**
 * 포트폴리오 백테스팅 엔진
 *
 * 책임:
 *  1. 최대 10개 종목 × 비중(%) 블렌드 → 월별 포트폴리오 수익률 시계열 생성
 *  2. 슬라이딩 윈도우로 최고(Best) / 중앙값(Median) / 최악(Worst) 시작 시점 탐색
 *  3. 각 시나리오별 DCA 누적 자산 곡선 배열 반환
 *  4. 상장 12년 미만 종목: 상장일부터 비중 재조정하여 계산
 *  5. 미국 증시 휴장일(주말·공휴일): Forward Fill 적용
 */

import type { StockDataPoint } from "@/lib/types";
import type {
  PortfolioItem,
  BacktestRequest,
  BacktestResponse,
  ScenarioResult,
  TimeSeriesPoint,
  BacktestWarning,
} from "@/lib/portfolio-types";

// ── 상수 ─────────────────────────────────────────────────
const TARGET_HISTORY_YEARS = 12;

// 도넛 차트용 10가지 색상 팔레트 (Toss 스타일)
export const PORTFOLIO_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

// ── 유틸 타입 ─────────────────────────────────────────────

interface MonthlyPoint {
  monthKey: string; // "YYYY-MM"
  ts: number;
  close: number;
}

interface StockMonthlyData {
  ticker: string;
  name: string;
  months: Map<string, number>; // monthKey → close price
  firstMonth: string;          // 상장 첫 월 "YYYY-MM"
  listingDate: string;         // "YYYY-MM-DD"
  hasShortHistory: boolean;    // 12년 미만
}

// ── 1. Forward Fill ───────────────────────────────────────

/**
 * 일별 주가 배열을 받아 월별 마지막 종가로 집계하고,
 * 빈 날짜(주말·휴장)는 앞날 종가로 채웁니다 (Forward Fill).
 */
function buildMonthlyMap(history: StockDataPoint[]): Map<string, number> {
  // 유효한 데이터만 추출 후 시간순 정렬
  const valid = history
    .filter((p) => Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (valid.length === 0) return new Map();

  // 전체 날짜 범위에서 일별 forward fill
  const dailyMap = new Map<string, number>();
  let lastClose = valid[0].close;

  const startDate = new Date(valid[0].date);
  const endDate = new Date(valid[valid.length - 1].date);

  let dataIdx = 0;
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = cursor.toISOString().slice(0, 10);

    // 해당 날짜의 실제 데이터가 있으면 사용, 없으면 forward fill
    if (dataIdx < valid.length && valid[dataIdx].date <= dateKey) {
      while (dataIdx < valid.length && valid[dataIdx].date <= dateKey) {
        lastClose = valid[dataIdx].close;
        dataIdx++;
      }
    }
    dailyMap.set(dateKey, lastClose);
    cursor.setDate(cursor.getDate() + 1);
  }

  // 일별 → 월별 마지막 종가
  const monthlyMap = new Map<string, number>();
  for (const [dateKey, close] of dailyMap) {
    const monthKey = dateKey.slice(0, 7); // "YYYY-MM"
    monthlyMap.set(monthKey, close); // 뒤 날짜가 덮어쓰므로 월말 종가가 남음
  }

  return monthlyMap;
}

// ── 2. 포트폴리오 블렌드 ─────────────────────────────────

/**
 * 전체 유니버스 월 목록을 생성하고,
 * 각 월에서 유효한 종목들의 비중을 재조정하여
 * 포트폴리오 월별 수익률(multiplier) 배열을 반환합니다.
 *
 * 반환: [{ monthKey, multiplier }]
 *   multiplier: 해당 월의 포트폴리오 가치 배율 (예: 1.03 = +3%)
 */
function buildPortfolioMonthlyReturns(
  stocks: StockMonthlyData[]
): Array<{ monthKey: string; multiplier: number }> {
  if (stocks.length === 0) return [];

  // 전체 날짜 범위: 가장 빠른 상장일 ~ 가장 최근 데이터
  const allMonths = new Set<string>();
  for (const s of stocks) {
    for (const key of s.months.keys()) allMonths.add(key);
  }

  const sortedMonths = Array.from(allMonths).sort();
  if (sortedMonths.length === 0) return [];

  const result: Array<{ monthKey: string; multiplier: number }> = [];

  // prevPrices: 전월 종가 캐시 (비중 가중 수익률 계산용)
  const prevPrices = new Map<string, number>();

  for (const monthKey of sortedMonths) {
    // 이번 달 가격이 있는 종목과 그 비중을 동적으로 계산
    const activeStocks: Array<{ ticker: string; weight: number; price: number }> = [];

    for (const stock of stocks) {
      const price = stock.months.get(monthKey);
      if (price === undefined) continue;

      // 원래 요청에 있던 비중 찾기 (stocks 배열에 weight 필드가 없으므로 따로 전달 필요)
      // → 이 함수는 buildPortfolioMonthlyReturnsFull 로 래핑하여 weight 주입
      activeStocks.push({ ticker: stock.ticker, weight: 0, price });
    }

    // 비중 값은 아래 래퍼에서 주입 (이 함수 내부에서는 index 사용)
    result.push({ monthKey, multiplier: 1 }); // placeholder, 래퍼에서 계산
  }

  return result;
}

/**
 * 종목 데이터 + 비중 정보를 받아 포트폴리오 월별 수익률 배열을 완성합니다.
 */
function buildBlendedMonthlyReturns(
  stocks: StockMonthlyData[],
  weights: number[] // stocks[i]에 대응하는 비중 (합계 100)
): Array<{ monthKey: string; totalReturn: number }> {
  const allMonths = new Set<string>();
  for (const s of stocks) {
    for (const key of s.months.keys()) allMonths.add(key);
  }

  const sortedMonths = Array.from(allMonths).sort();
  const result: Array<{ monthKey: string; totalReturn: number }> = [];

  for (let mi = 1; mi < sortedMonths.length; mi++) {
    const prevMonth = sortedMonths[mi - 1];
    const currMonth = sortedMonths[mi];

    let weightedReturn = 0;
    let activeWeight = 0;

    for (let si = 0; si < stocks.length; si++) {
      const stock = stocks[si];
      const prev = stock.months.get(prevMonth);
      const curr = stock.months.get(currMonth);

      if (prev === undefined || curr === undefined || prev <= 0) continue;

      const monthlyReturn = curr / prev - 1;
      weightedReturn += (weights[si] / 100) * monthlyReturn;
      activeWeight += weights[si] / 100;
    }

    // 활성 종목이 없는 달은 0% 수익률
    const normalizedReturn =
      activeWeight > 0 ? weightedReturn / activeWeight : 0;

    result.push({ monthKey: currMonth, totalReturn: normalizedReturn });
  }

  return result;
}

// (DCA 시뮬레이션은 buildPortfolioScenarios 내부의 projectCurve로 통합)

// ── 4. 시나리오 생성 (simulation-logic.ts 와 통일된 방식) ───────────────────
//
// 단일 종목과 동일하게:
//   블렌드 월수익률 → 롤링 CAGR 분포 → 90/50/10 퍼센타일 → DCA 곡선 투영
//
// 데이터 길이와 관계없이 항상 같은 경로를 사용하므로 분기 없음.

const CAGR_CAP = 0.30;         // simulation-logic.ts 와 동일
const MIN_ROLLING_SAMPLES = 5; // 샘플 부족 시 전체 기간 단일 CAGR 폴백

function buildPortfolioScenarios(
  blended: Array<{ monthKey: string; totalReturn: number }>,
  durationYears: number,
  initialInvestment: number,
  monthlyDCA: number
): { best: ScenarioResult; median: ScenarioResult; worst: ScenarioResult } {
  const durationMonths = Math.round(durationYears * 12);
  const periodYears = blended.length / 12;

  // simulation-logic.ts 와 동일한 윈도우 길이 공식
  const windowYears = Math.min(5, Math.max(1, periodYears * 0.6));
  const windowMonths = Math.max(12, Math.round(windowYears * 12));
  const years = windowMonths / 12;

  // 롤링 CAGR 계산
  let rollingCAGRs: number[] = [];
  for (let i = 0; i + windowMonths < blended.length; i++) {
    let product = 1;
    for (let j = 0; j < windowMonths; j++) {
      product *= 1 + blended[i + j].totalReturn;
    }
    if (product > 0) rollingCAGRs.push(Math.pow(product, 1 / years) - 1);
  }

  // 샘플 부족 → 전체 기간 단일 CAGR 폴백 (simulation-logic.ts 와 동일)
  if (rollingCAGRs.length < MIN_ROLLING_SAMPLES) {
    let product = 1;
    for (const { totalReturn } of blended) product *= 1 + totalReturn;
    const totalYears = blended.length / 12 || 1;
    rollingCAGRs = [product > 0 ? Math.pow(product, 1 / totalYears) - 1 : 0];
  }

  // 30% 캡 + 오름차순 정렬
  const sorted = rollingCAGRs.map((v) => Math.min(v, CAGR_CAP)).sort((a, b) => a - b);

  function pct(arr: number[], p: number) {
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)));
    return arr[idx];
  }

  const bestCAGR   = pct(sorted, 0.9);
  const medianCAGR = pct(sorted, 0.5);
  const worstCAGR  = pct(sorted, 0.1);

  // 곡선 시작 기준: 데이터 첫 월
  const startMonthKey = blended[0]?.monthKey ?? new Date().toISOString().slice(0, 7);

  function projectCurve(cagr: number, label: string): ScenarioResult {
    const monthlyRate = Math.pow(1 + cagr, 1 / 12) - 1;
    const curve: TimeSeriesPoint[] = [];
    let value = initialInvestment;
    const [yr0, mo0] = startMonthKey.split("-").map(Number);

    for (let m = 0; m < durationMonths; m++) {
      value = m === 0
        ? value * (1 + monthlyRate)
        : (value + monthlyDCA) * (1 + monthlyRate);
      value = Math.max(0, value);

      const d = new Date(yr0, mo0 - 1 + m, 1);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      curve.push({ date: dateKey, value: Math.round(value) });
    }

    const finalValue   = curve[curve.length - 1]?.value ?? initialInvestment;
    const totalInvested = initialInvestment + monthlyDCA * Math.max(0, durationMonths - 1);

    return {
      label,
      startDate: startMonthKey,
      finalValue,
      gainKRW: Math.round(finalValue - totalInvested),
      gainPct: totalInvested > 0
        ? Math.round(((finalValue - totalInvested) / totalInvested) * 1000) / 10
        : 0,
      cagr: Math.round(cagr * 1000) / 10,
      curve,
    };
  }

  return {
    best:   projectCurve(bestCAGR,   "최고 수익 시나리오 (Best Case)"),
    median: projectCurve(medianCAGR, "평균 수익 시나리오 (Median)"),
    worst:  projectCurve(worstCAGR,  "최저 수익 시나리오 (Worst Case)"),
  };
}

// ── 5. MDD (Maximum Drawdown) ────────────────────────────

function calcMDD(curve: TimeSeriesPoint[]): {
  mdd: number;
  recoveryMonths: number;
} {
  if (curve.length === 0) return { mdd: 0, recoveryMonths: 0 };

  let peak = curve[0].value;
  let mdd = 0;
  let peakIdx = 0;
  let maxRecovery = 0;
  let drawdownStart = -1;

  for (let i = 1; i < curve.length; i++) {
    const v = curve[i].value;
    if (v > peak) {
      if (drawdownStart >= 0) {
        maxRecovery = Math.max(maxRecovery, i - drawdownStart);
        drawdownStart = -1;
      }
      peak = v;
      peakIdx = i;
    } else {
      const dd = (peak - v) / peak;
      if (dd > mdd) {
        mdd = dd;
        if (drawdownStart < 0) drawdownStart = peakIdx;
      }
    }
  }

  return { mdd: Math.round(mdd * 1000) / 10, recoveryMonths: maxRecovery };
}

// ── 7. 공개 메인 함수 ─────────────────────────────────────

export interface BacktestEngineInput {
  request: BacktestRequest;
  /** 종목 ticker → 일별 주가 배열 맵 */
  stockDataMap: Map<string, { name: string; history: StockDataPoint[] }>;
}

/**
 * 포트폴리오 백테스팅 메인 함수
 *
 * @param input - 요청 파라미터 + 종목별 주가 히스토리 맵
 * @returns BacktestResponse 구조와 동일한 객체
 */
export function runPortfolioBacktest(input: BacktestEngineInput): BacktestResponse {
  const { request, stockDataMap } = input;
  const { initialInvestment, monthlyDCA, durationYears, items } = request;

  const windowMonths = Math.round(durationYears * 12);
  const targetHistoryMonths = TARGET_HISTORY_YEARS * 12;
  const warnings: BacktestWarning[] = [];

  // ── 단계 1: 각 종목의 월별 가격 맵 빌드 ────────────────
  const stocksData: StockMonthlyData[] = [];
  const validItems: PortfolioItem[] = [];

  for (const item of items) {
    const stockInfo = stockDataMap.get(item.ticker.toUpperCase());

    if (!stockInfo || stockInfo.history.length === 0) {
      warnings.push({
        ticker: item.ticker,
        type: "NO_DATA",
        message: `${item.ticker} 데이터를 찾을 수 없어 포트폴리오에서 제외됩니다.`,
      });
      continue;
    }

    const monthlyMap = buildMonthlyMap(stockInfo.history);
    if (monthlyMap.size === 0) {
      warnings.push({
        ticker: item.ticker,
        type: "NO_DATA",
        message: `${item.ticker} 유효한 가격 데이터가 없어 제외됩니다.`,
      });
      continue;
    }

    const sortedKeys = Array.from(monthlyMap.keys()).sort();
    const firstMonth = sortedKeys[0];
    const lastMonth = sortedKeys[sortedKeys.length - 1];

    // 상장 기간 계산
    const firstDate = new Date(firstMonth + "-01");
    const lastDate = new Date(lastMonth + "-01");
    const historyMonths =
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
      (lastDate.getMonth() - firstDate.getMonth());

    const hasShortHistory = historyMonths < targetHistoryMonths;
    const listingDate = sortedKeys[0] + "-01";

    if (hasShortHistory) {
      warnings.push({
        ticker: item.ticker,
        type: "SHORT_HISTORY",
        message: `${item.ticker} 데이터가 ${Math.round(historyMonths / 12 * 10) / 10}년치만 존재합니다. 상장일(${listingDate})부터 계산합니다.`,
        listingDate,
      });
    }

    stocksData.push({
      ticker: item.ticker.toUpperCase(),
      name: stockInfo.name,
      months: monthlyMap,
      firstMonth,
      listingDate,
      hasShortHistory,
    });
    validItems.push(item);
  }

  // 유효 종목이 없으면 빈 결과 반환
  if (stocksData.length === 0) {
    return buildEmptyResponse(request, warnings);
  }

  // 데이터 없는 종목 제외로 비중이 달라지면 경고
  if (validItems.length < items.length) {
    const removed = items
      .filter((it) => !validItems.find((v) => v.ticker === it.ticker))
      .map((it) => it.ticker)
      .join(", ");
    warnings.push({
      ticker: removed,
      type: "WEIGHT_ADJUSTED",
      message: `제외된 종목(${removed})의 비중이 나머지 종목에 비례하여 재조정됩니다.`,
    });
  }

  // 비중 재조정 (합계 100으로 정규화)
  const rawWeights = validItems.map((it) => it.weight);
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = rawWeights.map((w) =>
    weightSum > 0 ? (w / weightSum) * 100 : 100 / rawWeights.length
  );

  // ── 단계 2: 블렌드된 월별 수익률 계산 ──────────────────
  const blended = buildBlendedMonthlyReturns(stocksData, normalizedWeights);

  // 데이터 기간이 투자 기간보다 짧으면 경고만 추가 (계산은 동일하게 진행)
  const dataMonths = blended.length;
  const dataYears  = Math.round((dataMonths / 12) * 10) / 10;
  if (dataMonths < windowMonths) {
    warnings.push({
      ticker: validItems.map((i) => i.ticker).join(", "),
      type: "SHORT_HISTORY",
      message: `데이터 기간(${dataYears}년)이 투자 기간(${durationYears}년)보다 짧아 과거 수익률 패턴 기반으로 시나리오를 추정합니다.`,
    });
  }

  // ── 단계 3: CAGR 90/50/10 퍼센타일 → DCA 곡선 (simulation-logic.ts 통일) ──
  const { best, median, worst } = buildPortfolioScenarios(
    blended,
    durationYears,
    initialInvestment,
    monthlyDCA
  );

  // ── 단계 4: MDD (중앙값 곡선 기준) ──────────────────────
  const { mdd, recoveryMonths } = calcMDD(median.curve);

  return buildResponse(
    request,
    validItems,
    normalizedWeights,
    best,
    median,
    worst,
    {
      mdd,
      recoveryMonths,
      annualizedReturn: { best: best.cagr, median: median.cagr, worst: worst.cagr },
    },
    warnings
  );
}

// ── 헬퍼: 응답 조립 ──────────────────────────────────────

function buildResponse(
  request: BacktestRequest,
  validItems: PortfolioItem[],
  normalizedWeights: number[],
  best: ScenarioResult,
  median: ScenarioResult,
  worst: ScenarioResult,
  metrics: { mdd: number; recoveryMonths: number; annualizedReturn: { best: number; median: number; worst: number } },
  warnings: BacktestWarning[]
): BacktestResponse {
  const { initialInvestment, monthlyDCA, durationYears } = request;
  const totalInvested =
    initialInvestment + monthlyDCA * durationYears * 12;

  const allocation = validItems.map((item, i) => ({
    ticker: item.ticker,
    name: item.name,
    weight: Math.round(normalizedWeights[i] * 100) / 100,
    value: Math.round(normalizedWeights[i] * 100) / 100, // recharts PieChart용
  }));

  return {
    meta: {
      calculatedAt: new Date().toISOString(),
      initialInvestment,
      monthlyDCA,
      durationYears,
      totalInvested: Math.round(totalInvested),
    },
    allocation,
    scenarios: { best, median, worst },
    portfolioMetrics: metrics,
    warnings,
  };
}

function buildEmptyResponse(
  request: BacktestRequest,
  warnings: BacktestWarning[]
): BacktestResponse {
  const empty: ScenarioResult = {
    label: "데이터 없음",
    startDate: "",
    finalValue: request.initialInvestment,
    gainKRW: 0,
    gainPct: 0,
    cagr: 0,
    curve: [],
  };
  return {
    meta: {
      calculatedAt: new Date().toISOString(),
      initialInvestment: request.initialInvestment,
      monthlyDCA: request.monthlyDCA,
      durationYears: request.durationYears,
      totalInvested: request.initialInvestment,
    },
    allocation: [],
    scenarios: { best: empty, median: empty, worst: empty },
    portfolioMetrics: { mdd: 0, recoveryMonths: 0, annualizedReturn: { best: 0, median: 0, worst: 0 } },
    warnings,
  };
}
