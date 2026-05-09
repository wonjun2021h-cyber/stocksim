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
  priceHistory: StockDataPoint[];
}

export interface MarketData {
  usdKrw: number;
  nasdaq: number;
  sp500: number;
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
