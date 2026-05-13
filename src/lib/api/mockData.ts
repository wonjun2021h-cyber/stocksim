/**
 * Mock data implementations.
 * Replace with real API implementations when ready.
 */

import type { MarketData } from "@/lib/types";
import type { IMarketDataProvider, IStockPriceProvider } from "./interface";

// ---------------------------------------------------------------------------
// Mock market index data
// TODO: Replace with real-time API (e.g., Yahoo Finance, Alpha Vantage)
// ---------------------------------------------------------------------------
export class MockMarketDataProvider implements IMarketDataProvider {
  async getMarketData(): Promise<MarketData> {
    await new Promise((r) => setTimeout(r, 500));
    return {
      usdKrw: { price: 1480.8, change: -3.2, changePercent: -0.22, isUp: false },
      nasdaq: { price: 24836.78, change: 124.5, changePercent: 0.5, isUp: true },
      sp500: { price: 7165.08, change: 38.2, changePercent: 0.54, isUp: true },
      isLoading: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Mock current stock prices (USD)
// TODO: Replace with real-time API
// ---------------------------------------------------------------------------
const MOCK_PRICES: Record<string, number> = {
  GOOG: 178.25,
  AAPL: 211.45,
  MSFT: 421.5,
  AMZN: 198.3,
  META: 567.8,
  TSLA: 248.9,
  "BRK.A": 715000,
  QQQ: 485.2,
  SPY: 578.4,
  VOO: 530.1,
  LLY: 812.6,
  NVDA: 118.4,
  SNDK: 72.3,
  AMD: 168.9,
  INTC: 22.4,
  MU: 91.2,
  SBUX: 79.5,
  COST: 912.3,
  NFLX: 1045.7,
};

export class MockStockPriceProvider implements IStockPriceProvider {
  async getCurrentPrice(ticker: string): Promise<number | null> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PRICES[ticker] ?? null;
  }
}
