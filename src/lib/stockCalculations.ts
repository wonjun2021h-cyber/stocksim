/**
 * Stock investment calculation engine.
 * Computes DCA (Dollar-Cost Averaging) best/worst case returns
 * across all historical windows of the given duration.
 */

import type { StockDataPoint, CalculationInput, CalculationResult } from "@/lib/types";

/**
 * Simulate DCA investment over a slice of price history.
 * Buys `amount` worth of shares every `periodDays` trading days.
 *
 * Returns total invested, final portfolio value, gain/loss.
 */
function simulateDCA(
  history: StockDataPoint[],
  startIdx: number,
  endIdx: number,
  amount: number,
  periodDays: number
): { totalInvested: number; finalValue: number } {
  let totalShares = 0;
  let totalInvested = 0;
  let dayAccumulator = 0;

  const slice = history.slice(startIdx, endIdx + 1);

  for (let i = 0; i < slice.length; i++) {
    if (i === 0 || dayAccumulator >= periodDays) {
      const price = slice[i].close;
      totalShares += amount / price;
      totalInvested += amount;
      dayAccumulator = 0;
    }
    dayAccumulator++;
  }

  const finalPrice = slice[slice.length - 1]?.close ?? 0;
  const finalValue = totalShares * finalPrice;
  return { totalInvested, finalValue };
}

/**
 * Find the best and worst DCA outcomes across all possible start dates
 * within the stock's price history, for the given duration in months.
 */
export function calculateBestWorstReturns(
  history: StockDataPoint[],
  input: CalculationInput
): CalculationResult | null {
  if (history.length < 10) return null;

  const { amount, periodDays, durationMonths } = input;
  const targetTradingDays = Math.round((durationMonths / 12) * 252);

  if (history.length < targetTradingDays) {
    // Use all available data if history is shorter than requested duration
    const { totalInvested, finalValue } = simulateDCA(
      history,
      0,
      history.length - 1,
      amount,
      periodDays
    );
    const gain = finalValue - totalInvested;
    const gainPct = (gain / totalInvested) * 100;
    return {
      maxGain: gain,
      maxGainPct: gainPct,
      maxFinalValue: finalValue,
      minGain: gain,
      minGainPct: gainPct,
      minFinalValue: finalValue,
      totalInvested,
      isPositive: gain >= 0,
    };
  }

  let bestGain = -Infinity;
  let worstGain = Infinity;
  let bestResult = { totalInvested: 0, finalValue: 0 };
  let worstResult = { totalInvested: 0, finalValue: 0 };

  // Slide the window across all start dates
  const step = Math.max(1, Math.floor(targetTradingDays / 20)); // sample ~20 windows for speed
  for (
    let startIdx = 0;
    startIdx + targetTradingDays < history.length;
    startIdx += step
  ) {
    const endIdx = startIdx + targetTradingDays - 1;
    const sim = simulateDCA(history, startIdx, endIdx, amount, periodDays);
    const gain = sim.finalValue - sim.totalInvested;

    if (gain > bestGain) {
      bestGain = gain;
      bestResult = sim;
    }
    if (gain < worstGain) {
      worstGain = gain;
      worstResult = sim;
    }
  }

  const maxGainPct = (bestGain / bestResult.totalInvested) * 100;
  const minGainPct = (worstGain / worstResult.totalInvested) * 100;

  return {
    maxGain: bestGain,
    maxGainPct: Math.round(maxGainPct * 10) / 10,
    maxFinalValue: Math.round(bestResult.finalValue),
    minGain: worstGain,
    minGainPct: Math.round(minGainPct * 10) / 10,
    minFinalValue: Math.round(worstResult.finalValue),
    totalInvested: bestResult.totalInvested,
    isPositive: bestGain > 0,
  };
}

/** Format a number as Korean Won string */
export function formatKRW(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

/** Format a number as USD string */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
