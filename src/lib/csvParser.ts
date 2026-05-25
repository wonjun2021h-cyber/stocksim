/**
 * CSV Parser — PapaParse-based stock data loader.
 *
 * Supports the current wide format (pairs of Date/Close columns per stock)
 * and can be extended to support long format CSVs with 700+ stocks.
 *
 * CSV format (wide):
 *   Row 1: name1, ticker1, name2, ticker2, ...
 *   Row 2: Date, Close, Date, Close, ...
 *   Row 3+: date value, close value, ...
 */

import Papa from "papaparse";
import type { StockInfo, StockDataPoint } from "@/lib/types";

interface RawRow {
  [key: string]: string;
}

const MIN_CAGR_YEARS = 3;
const COMPARISON_BASE_YEARS = 12;

/**
 * Parse a wide-format CSV string into an array of StockInfo objects.
 * Called server-side (Node.js fs) or client-side (fetch).
 */
export function parseWideFormatCSV(csvText: string): StockInfo[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data as string[][];
  if (rows.length < 3) return [];

  const headerRow = rows[0];
  const stocks: StockInfo[] = [];
  const stockCount = Math.floor(headerRow.length / 2);

  // Build metadata for each stock
  for (let i = 0; i < stockCount; i++) {
    const name = headerRow[i * 2]?.trim();
    const ticker = headerRow[i * 2 + 1]?.trim();
    if (!name || !ticker) continue;

    stocks.push({
      name,
      ticker,
      currentPrice: null,
      annualReturnRate: null,
      annualReturnPeriodYears: null,
      hasInsufficientData: true,
      hasPeriodMismatchWarning: false,
      priceHistory: [],
    });
  }

  // Parse data rows (skip rows[1] which is the Date/Close header row)
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    for (let i = 0; i < stocks.length; i++) {
      const dateStr = row[i * 2]?.trim();
      const closeStr = row[i * 2 + 1]?.trim();
      if (!dateStr || !closeStr) continue;

      const close = parseFloat(closeStr);
      if (isNaN(close)) continue;

      // Normalize Korean date format: "2014. 5. 5 오후 4:00:00" → "2014-05-05"
      const normalizedDate = normalizeDateString(dateStr);
      if (!normalizedDate) continue;

      stocks[i].priceHistory.push({ date: normalizedDate, close });
    }
  }

  // Sort histories by date and compute annual return
  for (const stock of stocks) {
    stock.priceHistory.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const annualStats = computeAnnualReturn(stock.priceHistory, stock.ticker);
    stock.annualReturnRate = annualStats.cagrPercent;
    stock.annualReturnPeriodYears = annualStats.periodYears;
    stock.hasInsufficientData = false;
    stock.hasPeriodMismatchWarning = annualStats.periodYears !== null
      ? annualStats.periodYears < COMPARISON_BASE_YEARS
      : false;
    // Set currentPrice to the latest close
    if (stock.priceHistory.length > 0) {
      stock.currentPrice =
        stock.priceHistory[stock.priceHistory.length - 1].close;
    }
  }

  return stocks.filter((s) => s.priceHistory.length > 0);
}

/**
 * Normalize Korean/ISO date strings to YYYY-MM-DD.
 * Handles: "2014. 5. 5 오후 4:00:00", "2014-05-05", "5/5/2014"
 */
function normalizeDateString(raw: string): string | null {
  // Korean format: "2014. 5. 5 오후 4:00:00" or "2014. 5. 5 오전 4:00:00"
  const koreanMatch = raw.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (koreanMatch) {
    const y = koreanMatch[1];
    const m = koreanMatch[2].padStart(2, "0");
    const d = koreanMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // ISO format: already "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.substring(0, 10);
  }
  return null;
}

function getValidPriceHistory(history: StockDataPoint[]): StockDataPoint[] {
  return history.filter((point) => {
    const ts = new Date(point.date).getTime();
    return Number.isFinite(ts) && Number.isFinite(point.close) && point.close > 0;
  });
}

/**
 * Compute Compound Annual Growth Rate (CAGR) from price history.
 * Returns a percentage (e.g. 10.5 for 10.5% per year).
 */
function computeAnnualReturn(
  history: StockDataPoint[],
  ticker: string
): {
  cagrPercent: number | null;
  periodYears: number | null;
  insufficientData: boolean;
} {
  const validHistory = getValidPriceHistory(history);
  if (validHistory.length < 2) {
    return { cagrPercent: null, periodYears: null, insufficientData: true };
  }

  const first = validHistory[0];
  const last = validHistory[validHistory.length - 1];
  const years =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);
  const roundedYears = Math.round(years * 100) / 100;

  console.log(
    `[DATA_RANGE] ${ticker}: valid ${first.date} ~ ${last.date} (${roundedYears}y)`
  );

  if (years < MIN_CAGR_YEARS) {
    console.log(
      `[CAGR_SKIPPED] ${ticker}: insufficient data (${roundedYears}y < ${MIN_CAGR_YEARS}y)`
    );
    return { cagrPercent: null, periodYears: roundedYears, insufficientData: true };
  }

  if (years < 0.1) {
    return { cagrPercent: null, periodYears: roundedYears, insufficientData: true };
  }
  const cagr = (Math.pow(last.close / first.close, 1 / years) - 1) * 100;
  const roundedCagr = Math.round(cagr * 100) / 100;
  console.log(
    `[CAGR_CALC] ${ticker}: start=${first.close}, end=${last.close}, years=${roundedYears}, cagr=${roundedCagr}%`
  );

  return {
    cagrPercent: roundedCagr,
    periodYears: roundedYears,
    insufficientData: false,
  };
}

/**
 * Client-side: fetch CSV from /data/stocks.csv and parse it.
 * Also merges JSON-based stocks if index.json exists.
 * Returns a map of ticker → StockInfo for fast lookup.
 */
export async function fetchAndParseStocks(): Promise<Map<string, StockInfo>> {
  const stocks = await fetchAllStocks();
  const map = new Map<string, StockInfo>();
  for (const s of stocks) {
    map.set(s.ticker, s);
    map.set(s.name, s);
  }
  return map;
}

export interface StockIndexEntry {
  ticker: string;
  name: string;
  uptrending: boolean;
  dataPoints: number;
  startDate: string;
  endDate: string;
}

/**
 * Helper to get all stocks as a list (for stock browser / search).
 * JSON index 우선 사용. JSON이 비어 있을 때만 CSV 폴백.
 * → 불필요한 CSV 로딩 제거로 첫 로딩 속도 개선.
 */
export async function fetchAllStocks(): Promise<StockInfo[]> {
  // 1) JSON index 시도 (메인 소스)
  try {
    const res = await fetch("/data/stocks/index.json");
    if (res.ok) {
      const index: StockIndexEntry[] = await res.json();
      if (Array.isArray(index) && index.length > 0) {
        return index.map((entry) => ({
          ticker: entry.ticker,
          name: entry.name,
          currentPrice: null,
          annualReturnRate: null,
          annualReturnPeriodYears: null,
          hasInsufficientData: false,
          hasPeriodMismatchWarning: false,
          dataEndDate: entry.endDate,
          priceHistory: [],
        })) as StockInfo[];
      }
    }
  } catch {
    // JSON 실패 → CSV 폴백
  }

  // 2) CSV 폴백 (JSON index 없을 때만)
  try {
    const res = await fetch("/data/stocks.csv");
    if (res.ok) {
      const text = await res.text();
      return parseWideFormatCSV(text);
    }
  } catch {
    // ignore
  }

  return [];
}
