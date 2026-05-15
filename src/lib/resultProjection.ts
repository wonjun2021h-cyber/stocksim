import type { SimulationResult } from "@/lib/simulation-logic";

export interface ProjectionInput {
  result: SimulationResult;
  totalInvestedKRW: number;
  durationYears: number;
  totalPayments: number;
  periodicPayment: number;
  ticker?: string;
}

export interface ProjectionOutput {
  bestFinalKRW: number;
  worstFinalKRW: number;
  rawWorstFinalKRW: number;
  worstFloorApplied: boolean;
  maxGainKRW: number;
  minGainKRW: number;
  maxGainPct: number;
  minGainPct: number;
  needsDataReview: boolean;
  correctionApplied: boolean;
}

function getDynamicCagrCap(investmentYears: number): number {
  if (investmentYears >= 21) return 0.12;
  if (investmentYears >= 10) return 0.2;
  if (investmentYears >= 5) return 0.25;
  return 0.3;
}

const MARKET_AVG_CAGR = 0.1;
const REVERSION_START_YEAR = 10;
const REVERSION_FULL_YEAR = 30;

function withMeanReversion(cagr: number, investmentYears: number): number {
  if (investmentYears <= REVERSION_START_YEAR || cagr <= MARKET_AVG_CAGR) {
    return cagr;
  }
  let cumulative = Math.pow(1 + cagr, REVERSION_START_YEAR);
  for (let y = REVERSION_START_YEAR + 1; y <= investmentYears; y++) {
    const blend = Math.min(
      1,
      (y - REVERSION_START_YEAR) / (REVERSION_FULL_YEAR - REVERSION_START_YEAR)
    );
    const yearRate = cagr * (1 - blend) + MARKET_AVG_CAGR * blend;
    cumulative *= 1 + yearRate;
  }
  return Math.pow(cumulative, 1 / investmentYears) - 1;
}

function getWorstFloorMultiplier(durationYears: number): number | null {
  if (durationYears < 1) return null;
  if (durationYears >= 15) return 1.1;
  if (durationYears >= 10) return 0.95;
  if (durationYears >= 5) return 0.8;
  return 0.6;
}

function scaleCagrForHorizon(cagr: number, durationYears: number): number {
  if (durationYears >= 1) return cagr;
  return cagr * Math.max(durationYears, 1 / 365);
}

function dcaFinalValue(
  periodicPayment: number,
  totalPayments: number,
  annualRate: number,
  totalYears: number
): number {
  if (totalPayments <= 0) return 0;
  if (Math.abs(annualRate) < 0.001) return periodicPayment * totalPayments;

  const totalGrowth = Math.pow(1 + annualRate, totalYears);
  const periodGrowth = Math.pow(1 + annualRate, totalYears / totalPayments);

  if (Math.abs(periodGrowth - 1) < 1e-10) return periodicPayment * totalPayments;

  return (periodicPayment * (totalGrowth - 1)) / (periodGrowth - 1);
}

const SANITY_MULTIPLIER = 20;

export function computeProjection(input: ProjectionInput): ProjectionOutput {
  const { result, totalInvestedKRW, durationYears, totalPayments, periodicPayment, ticker = "unknown" } = input;

  const years = Math.max(durationYears, 1 / 365);
  const payments = Math.max(1, totalPayments);

  const dynamicCap = getDynamicCagrCap(years);
  const cappedBest = scaleCagrForHorizon(Math.min(result.best, dynamicCap), years);
  const cappedWorst = scaleCagrForHorizon(Math.min(result.worst, MARKET_AVG_CAGR), years);
  const dynamicCapped =
    cappedBest < result.best || cappedWorst < result.worst;

  const effectiveBest = withMeanReversion(cappedBest, years);
  const effectiveWorst = withMeanReversion(cappedWorst, years);
  const meanReverted =
    years > REVERSION_START_YEAR && effectiveBest < cappedBest;

  const rawBestFinalKRW = Math.round(dcaFinalValue(periodicPayment, payments, effectiveBest, years));
  const rawWorstFinalKRW = Math.round(dcaFinalValue(periodicPayment, payments, effectiveWorst, years));

  const floorMultiplier = result.dataInsufficient ? null : getWorstFloorMultiplier(durationYears);
  const floorKRW =
    floorMultiplier !== null ? Math.round(totalInvestedKRW * floorMultiplier) : null;
  const worstFinalKRW =
    floorKRW !== null ? Math.max(rawWorstFinalKRW, floorKRW) : rawWorstFinalKRW;
  const bestFinalKRW = rawBestFinalKRW;

  const maxGainKRW = bestFinalKRW - totalInvestedKRW;
  const minGainKRW = worstFinalKRW - totalInvestedKRW;
  const maxGainPct = (maxGainKRW / totalInvestedKRW) * 100;
  const minGainPct = (minGainKRW / totalInvestedKRW) * 100;

  if (dynamicCapped || meanReverted) {
    console.log(`[PROJECTION] ${ticker} ${years.toFixed(2)}y best=${bestFinalKRW} worst=${worstFinalKRW}`);
  }

  return {
    bestFinalKRW,
    worstFinalKRW,
    rawWorstFinalKRW,
    worstFloorApplied: worstFinalKRW > rawWorstFinalKRW,
    maxGainKRW,
    minGainKRW,
    maxGainPct,
    minGainPct,
    needsDataReview: bestFinalKRW > totalInvestedKRW * SANITY_MULTIPLIER,
    correctionApplied: result.cagrCapped || dynamicCapped || meanReverted,
  };
}

export function formatDurationLabel(
  value: number,
  unit: "days" | "months" | "years"
): string {
  if (unit === "years") return `${value}년`;
  if (unit === "months") {
    if (value >= 12 && value % 12 === 0) return `${value / 12}년`;
    return `${value}개월`;
  }
  return `${value}일`;
}
