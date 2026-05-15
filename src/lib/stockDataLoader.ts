/**
 * Stock data loader — JSON 기반 (public/data/stocks/)
 *
 * 구조:
 *   public/data/stocks/index.json   — 전체 종목 메타데이터
 *   public/data/stocks/{TICKER}.json — 개별 종목 히스토리
 */

import type { StockInfo, StockDataPoint } from "@/lib/types";

const MIN_CAGR_YEARS = 3;
const COMPARISON_BASE_YEARS = 12;

export interface StockIndexEntry {
  ticker: string;
  name: string;
  uptrending: boolean;
  dataPoints: number;
  startDate: string;
  endDate: string;
}

interface StockFileData {
  ticker: string;
  name: string;
  uptrending: boolean;
  history: { date: string; close: number }[];
}

// ── 인덱스 로드 ───────────────────────────────────────────────────────────────

let _indexCache: StockIndexEntry[] | null = null;

export async function loadStockIndex(): Promise<StockIndexEntry[]> {
  if (_indexCache) return _indexCache;
  try {
    const res = await fetch("/data/stocks/index.json");
    if (!res.ok) return [];
    _indexCache = await res.json();
    return _indexCache ?? [];
  } catch {
    return [];
  }
}

// ── 개별 종목 로드 ────────────────────────────────────────────────────────────

const _stockCache = new Map<string, StockInfo>();

export async function loadStockByTicker(ticker: string): Promise<StockInfo | null> {
  const key = ticker.toUpperCase();
  if (_stockCache.has(key)) return _stockCache.get(key)!;

  try {
    const res = await fetch(`/data/stocks/${key}.json`);
    if (!res.ok) return null;
    const data: StockFileData = await res.json();
    const stock = buildStockInfo(data);
    _stockCache.set(key, stock);
    return stock;
  } catch {
    return null;
  }
}

// ── 전체 종목 목록 (메타데이터만) ─────────────────────────────────────────────

export async function loadAllStocksMetadata(): Promise<StockInfo[]> {
  const index = await loadStockIndex();
  return index.map((entry) => ({
    ticker: entry.ticker,
    name: entry.name,
    currentPrice: null,
    annualReturnRate: null,
    annualReturnPeriodYears: null,
    hasInsufficientData: !entry.uptrending,
    hasPeriodMismatchWarning: false,
    priceHistory: [],
  }));
}

// ── 전체 종목 + 히스토리 (시뮬레이션용) ──────────────────────────────────────

export async function loadAllStocksWithHistory(): Promise<StockInfo[]> {
  const index = await loadStockIndex();

  const results = await Promise.all(
    index.map((entry) => loadStockByTicker(entry.ticker))
  );

  return results.filter((s): s is StockInfo => s !== null);
}

// ── ticker 또는 name 으로 검색 ────────────────────────────────────────────────

export async function findStock(query: string): Promise<StockInfo | null> {
  const q = query.trim().toUpperCase();

  // 직접 ticker로 시도
  const byTicker = await loadStockByTicker(q);
  if (byTicker) return byTicker;

  // index에서 이름 검색
  const index = await loadStockIndex();
  const found = index.find(
    (e) =>
      e.ticker.toUpperCase() === q ||
      e.name.toLowerCase().includes(query.toLowerCase())
  );
  if (found) return loadStockByTicker(found.ticker);

  return null;
}

// ── 내부 유틸 ────────────────────────────────────────────────────────────────

function buildStockInfo(data: StockFileData): StockInfo {
  const priceHistory: StockDataPoint[] = (data.history ?? []).map((p) => ({
    date: p.date,
    close: p.close,
  }));

  priceHistory.sort((a, b) => a.date.localeCompare(b.date));

  const currentPrice =
    priceHistory.length > 0
      ? priceHistory[priceHistory.length - 1].close
      : null;

  const annualStats = computeAnnualReturn(priceHistory);

  return {
    ticker: data.ticker,
    name: data.name,
    currentPrice,
    annualReturnRate: annualStats.cagrPercent,
    annualReturnPeriodYears: annualStats.periodYears,
    hasInsufficientData: annualStats.insufficientData,
    hasPeriodMismatchWarning:
      annualStats.periodYears !== null
        ? annualStats.periodYears < COMPARISON_BASE_YEARS
        : false,
    priceHistory,
  };
}

function computeAnnualReturn(history: StockDataPoint[]): {
  cagrPercent: number | null;
  periodYears: number | null;
  insufficientData: boolean;
} {
  const valid = history.filter(
    (p) => Number.isFinite(p.close) && p.close > 0
  );
  if (valid.length < 2)
    return { cagrPercent: null, periodYears: null, insufficientData: true };

  const first = valid[0];
  const last = valid[valid.length - 1];
  const years =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);

  if (years < MIN_CAGR_YEARS)
    return { cagrPercent: null, periodYears: Math.round(years * 100) / 100, insufficientData: true };

  const cagr = (Math.pow(last.close / first.close, 1 / years) - 1) * 100;
  return {
    cagrPercent: Math.round(cagr * 100) / 100,
    periodYears: Math.round(years * 100) / 100,
    insufficientData: false,
  };
}
