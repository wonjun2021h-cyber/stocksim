/**
 * API Interface Layer
 *
 * Replace the mock implementations below with real API calls
 * (e.g., Yahoo Finance, Alpha Vantage, KIS API) without changing
 * any component code — only swap the implementation here.
 */

import type { MarketData } from "@/lib/types";

// ---------------------------------------------------------------------------
// Market data provider interface
// ---------------------------------------------------------------------------
export interface IMarketDataProvider {
  getMarketData(): Promise<MarketData>;
}

// ---------------------------------------------------------------------------
// Stock price provider interface
// ---------------------------------------------------------------------------
export interface IStockPriceProvider {
  getCurrentPrice(ticker: string): Promise<number | null>;
}

// ---------------------------------------------------------------------------
// Real Yahoo Finance implementation (via internal API route)
// ---------------------------------------------------------------------------
export class YahooMarketDataProvider implements IMarketDataProvider {
  async getMarketData(): Promise<MarketData> {
    const res = await fetch("/api/market", { cache: "no-store" });
    if (!res.ok) throw new Error("market fetch failed");
    const data = await res.json();
    return {
      usdKrw: data.usdKrw,
      nasdaq: data.nasdaq,
      sp500: data.sp500,
      isLoading: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory — swapped to real Yahoo Finance provider
// ---------------------------------------------------------------------------
export { YahooMarketDataProvider as MarketDataProvider };
export { MockStockPriceProvider as StockPriceProvider } from "./mockData";
