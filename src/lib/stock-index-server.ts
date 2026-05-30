import { readFileSync } from "fs";
import path from "path";

export interface StockIndexEntry {
  ticker: string;
  name: string;
  uptrending: boolean;
  dataPoints: number;
  startDate: string;
  endDate: string;
}

let indexCache: StockIndexEntry[] | null = null;

/** 서버 전용 — sitemap·generateMetadata */
export function readStockIndex(): StockIndexEntry[] {
  if (indexCache) return indexCache;
  const filePath = path.join(process.cwd(), "public/data/stocks/index.json");
  indexCache = JSON.parse(readFileSync(filePath, "utf-8")) as StockIndexEntry[];
  return indexCache;
}

export function findStockByTicker(ticker: string): StockIndexEntry | undefined {
  const upper = decodeURIComponent(ticker).trim().toUpperCase();
  return readStockIndex().find((s) => s.ticker.toUpperCase() === upper);
}
