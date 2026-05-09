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
// Factory — swap these exports when connecting a real API
// ---------------------------------------------------------------------------
export { MockMarketDataProvider as MarketDataProvider } from "./mockData";
export { MockStockPriceProvider as StockPriceProvider } from "./mockData";
