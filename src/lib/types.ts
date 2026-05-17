export interface StockDataPoint {
  date: string;
  close: number;
}

export interface StockInfo {
  name: string;
  ticker: string;
  currentPrice: number | null;
  annualReturnRate: number | null;
  annualReturnPeriodYears: number | null;
  hasInsufficientData: boolean;
  hasPeriodMismatchWarning: boolean;
  /** 가격 데이터 마지막 날짜 (YYYY-MM-DD) — 신선도 표시용 */
  dataEndDate?: string;
  priceHistory: StockDataPoint[];
}

export interface MarketQuote {
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
}

export interface MarketData {
  usdKrw: MarketQuote;
  nasdaq: MarketQuote;
  sp500: MarketQuote;
  isLoading: boolean;
}

export interface CalculationInput {
  amount: number;
  periodDays: number;
  durationMonths: number;
}

export interface CalculationResult {
  maxGain: number;
  maxGainPct: number;
  maxFinalValue: number;
  minGain: number;
  minGainPct: number;
  minFinalValue: number;
  totalInvested: number;
  isPositive: boolean;
}

export type PeriodLabel = "매일" | "매주" | "매달" | "매분기";

export const PERIOD_DAYS: Record<PeriodLabel, number> = {
  매일: 1,
  매주: 7,
  매달: 30,
  매분기: 90,
};
