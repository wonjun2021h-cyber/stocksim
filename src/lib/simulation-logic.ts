import type { StockDataPoint, StockInfo } from "@/lib/types";

export interface SimulationResult {
  base: number;
  best: number;
  worst: number;
  mdd: number;
  recoveryMonths: number;
  /** 롤링 창 길이(년) */
  rollingWindowYears: number;
  /** 데이터 기간이 3년 미만 — 계산은 됐지만 신뢰도 낮음 */
  dataInsufficient: boolean;
  /** 최대 수익이 원금 20배 초과 — 데이터 검토 필요 */
  needsDataReview: boolean;
  /** best/base가 30% 캡으로 보정됨 */
  cagrCapped: boolean;
}

export type StockLookupItem = Pick<StockInfo, "name" | "ticker" | "priceHistory">;

interface MonthlyClosePoint {
  monthKey: string;
  close: number;
  ts: number;
}

interface DrawdownMetrics {
  mdd: number;
  recoveryMonths: number;
}

const MIN_VALID_YEARS = 3;    // 이 미만이면 dataInsufficient=true, but still calculate
const CAP_YEARS = 15;
const MIN_ROLLING_SAMPLES = 5; // 부족하면 단일 CAGR로 폴백
const CAGR_CAP = 0.30;         // 30% 초과 시 현실 보정 캡

/**
 * Build scenario returns from monthly closing prices using rolling windows.
 *
 * - window = min(15y, actual data period)
 * - best  = 90th percentile of all rolling CAGRs
 * - base  = 50th percentile (median)
 * - worst = 10th percentile
 * - 데이터가 있으면 무조건 계산. 3년 미만이면 dataInsufficient=true만 세움.
 */
export function calculateSimulationScenarios(
  history: StockDataPoint[],
  ticker = "unknown"
): SimulationResult | null {
  const validHistory = history.filter(
    (point) => Number.isFinite(point.close) && point.close > 0
  );
  const monthlyCloses = buildMonthlyCloses(validHistory);

  // 진짜 데이터 없음 — null 반환 (호출자가 UI 처리)
  if (monthlyCloses.length < 2) {
    console.warn(`[SIM_BUG] ${ticker}: 유효 월간 데이터 ${monthlyCloses.length}개 — 계산 불가`);
    return null;
  }

  const periodYears = computePeriodYears(monthlyCloses);
  const dataInsufficient = periodYears < MIN_VALID_YEARS;

  if (dataInsufficient) {
    console.warn(
      `[SIM_SHORT] ${ticker}: 데이터 ${periodYears.toFixed(2)}년 (< ${MIN_VALID_YEARS}년) — 그대로 계산하지만 신뢰도 낮음`
    );
  }

  // 버그 1 수정: 롤링 윈도우를 데이터 기간의 최대 60%, 최소 1년, 최대 5년으로 설정
  // → windowMonths가 항상 monthlyCloses.length보다 충분히 작아 여러 샘플 확보
  const maxWindowYears = Math.min(CAP_YEARS, periodYears);
  const windowYears = Math.min(5, Math.max(1, maxWindowYears * 0.6));
  const windowMonths = Math.max(12, Math.round(windowYears * 12));

  let rollingCAGRs = buildRollingCAGRs(monthlyCloses, windowMonths);

  // 롤링 샘플 부족 → 전체 기간 단일 CAGR로 폴백
  if (rollingCAGRs.length < MIN_ROLLING_SAMPLES) {
    const fallback = computeSingleCAGR(monthlyCloses);
    if (fallback !== null) {
      console.warn(
        `[SIM_FALLBACK] ${ticker}: 롤링 샘플 ${rollingCAGRs.length}개 부족 → 단일 CAGR ${(fallback * 100).toFixed(1)}% 사용`
      );
      rollingCAGRs = [fallback];
    }
  }

  if (rollingCAGRs.length === 0) {
    console.warn(`[SIM_BUG] ${ticker}: 폴백 후에도 샘플 0 — 반환 불가`);
    return null;
  }

  // 캡을 시뮬레이션 입력값(개별 롤링 CAGR)에 직접 적용
  const uncappedMax = Math.max(...rollingCAGRs);
  const cappedCAGRs = rollingCAGRs.map(v => Math.min(v, CAGR_CAP));
  const cagrCapped = cappedCAGRs.some((v, i) => v < rollingCAGRs[i]);

  if (cagrCapped) {
    const cappedMax = Math.max(...cappedCAGRs);
    console.log(
      `[CAGR_CAP] ${ticker}: 원래 최대 CAGR ${(uncappedMax * 100).toFixed(1)}% → 보정 후 ${(cappedMax * 100).toFixed(1)}%` +
      ` (${cappedCAGRs.filter((v, i) => v < rollingCAGRs[i]).length}개 샘플 보정됨)`
    );
  }

  const sorted = [...cappedCAGRs].sort((a, b) => a - b);

  // 상위 10% / 중간값 / 하위 10% 분리
  const best  = percentile(sorted, 0.9);
  const base  = percentile(sorted, 0.5);
  const worst = percentile(sorted, 0.1);

  // 0 반환 버그 감지
  if (best === 0 || base === 0 || worst === 0) {
    console.warn(
      `[SIM_BUG] ${ticker}: best/base/worst 중 0 발생 — ` +
      `best=${(best * 100).toFixed(2)}% base=${(base * 100).toFixed(2)}% worst=${(worst * 100).toFixed(2)}%`
    );
  }

  console.log(
    `[SIM] ${ticker} window=${windowYears.toFixed(1)}y samples=${sorted.length}` +
    (cagrCapped ? " [캡적용]" : "") +
    ` | worst=${(worst * 100).toFixed(1)}% base=${(base * 100).toFixed(1)}% best=${(best * 100).toFixed(1)}%`
  );

  const drawdown = computeMddAndRecovery(monthlyCloses);

  return {
    base,
    best,
    worst,
    mdd: drawdown.mdd,
    recoveryMonths: drawdown.recoveryMonths,
    rollingWindowYears: windowYears,
    dataInsufficient,
    needsDataReview: false,
    cagrCapped,
  };
}

/**
 * Independent entrypoint for large universes (e.g. 800 stocks).
 * Looks up a stock by name or ticker and returns scenario metrics.
 */
export function calculateSimulationByStockName(
  stockName: string,
  stocks: StockLookupItem[]
): SimulationResult | null {
  const key = normalizeStockKey(stockName);
  if (!key || stocks.length === 0) return null;

  const stockIndex = buildStockIndex(stocks);
  const target = stockIndex.get(key);
  if (!target || target.priceHistory.length === 0) return null;

  return calculateSimulationScenarios(target.priceHistory, target.ticker);
}

function buildStockIndex(stocks: StockLookupItem[]): Map<string, StockLookupItem> {
  const index = new Map<string, StockLookupItem>();

  for (const stock of stocks) {
    const nameKey = normalizeStockKey(stock.name);
    const tickerKey = normalizeStockKey(stock.ticker);
    if (nameKey) index.set(nameKey, stock);
    if (tickerKey) index.set(tickerKey, stock);
  }

  return index;
}

function normalizeStockKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildMonthlyCloses(history: StockDataPoint[]): MonthlyClosePoint[] {
  const monthlyMap = new Map<string, { ts: number; close: number }>();

  for (const point of history) {
    const ts = new Date(point.date).getTime();
    if (!Number.isFinite(ts) || !Number.isFinite(point.close) || point.close <= 0) {
      continue;
    }

    const d = new Date(ts);
    const monthKey = `${d.getUTCFullYear()}-${String(
      d.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    const existing = monthlyMap.get(monthKey);

    // Keep the latest close in each month (= month-end close proxy)
    if (!existing || ts > existing.ts) {
      monthlyMap.set(monthKey, { ts, close: point.close });
    }
  }

  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([monthKey, value]) => ({ monthKey, close: value.close, ts: value.ts }));
}

/**
 * All possible rolling CAGR values for the given window length.
 * Each entry is the annualized return from monthlyCloses[i] to monthlyCloses[i + windowMonths].
 */
function buildRollingCAGRs(
  monthlyCloses: MonthlyClosePoint[],
  windowMonths: number
): number[] {
  const results: number[] = [];
  const years = windowMonths / 12;

  for (let i = 0; i + windowMonths < monthlyCloses.length; i++) {
    const start = monthlyCloses[i].close;
    const end   = monthlyCloses[i + windowMonths].close;
    if (start > 0 && end > 0 && years > 0) {
      results.push(Math.pow(end / start, 1 / years) - 1);
    }
  }

  return results;
}

/**
 * Single CAGR from first to last data point. Fallback for short-history stocks.
 */
function computeSingleCAGR(monthlyCloses: MonthlyClosePoint[]): number | null {
  const start = monthlyCloses[0]?.close;
  const end   = monthlyCloses[monthlyCloses.length - 1]?.close;
  const years = computePeriodYears(monthlyCloses);
  if (!start || !end || start <= 0 || end <= 0 || years <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

/** p = 0~1. sorted must be ascending. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p))
  );
  return sorted[idx];
}

function computeMddAndRecovery(
  monthlyCloses: MonthlyClosePoint[]
): DrawdownMetrics {
  if (monthlyCloses.length === 0) return { mdd: 0, recoveryMonths: 0 };

  let peak = monthlyCloses[0].close;
  let mdd = 0;

  let peakIndex = 0;
  let activePeakIndex = 0;
  let maxRecoveryMonths = 0;
  let inDrawdown = false;

  for (let i = 1; i < monthlyCloses.length; i++) {
    const price = monthlyCloses[i].close;
    if (!Number.isFinite(price) || price <= 0) continue;

    if (price > peak) {
      peak = price;
      peakIndex = i;
      activePeakIndex = i;
      inDrawdown = false;
      continue;
    }

    const drawdown = peak > 0 ? (peak - price) / peak : 0;
    if (drawdown > 0 && !inDrawdown) {
      inDrawdown = true;
      activePeakIndex = peakIndex;
    }
    mdd = Math.max(mdd, drawdown);

    if (inDrawdown && price >= peak) {
      const recoveryMonths = i - activePeakIndex;
      maxRecoveryMonths = Math.max(maxRecoveryMonths, recoveryMonths);
      inDrawdown = false;
    }
  }

  return { mdd, recoveryMonths: maxRecoveryMonths };
}

function computePeriodYears(monthlyCloses: MonthlyClosePoint[]): number {
  const first = monthlyCloses[0];
  const last = monthlyCloses[monthlyCloses.length - 1];
  if (!first || !last) return 0;
  return (last.ts - first.ts) / (1000 * 60 * 60 * 24 * 365.25);
}
