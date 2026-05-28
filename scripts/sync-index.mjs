/**
 * public/data/stocks/*.json 과 index.json 동기화
 * JSON은 있는데 index에 없는 종목을 검색 목록에 추가합니다.
 * Usage: node scripts/sync-index.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STOCKS_DIR = join(__dirname, "..", "public", "data", "stocks");
const INDEX_PATH = join(STOCKS_DIR, "index.json");

function loadIndex() {
  if (!existsSync(INDEX_PATH)) return [];
  return JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
}

function entryFromJson(ticker, data) {
  return {
    ticker,
    name: data.name ?? ticker,
    uptrending: Boolean(data.uptrending),
    dataPoints: data.dataPoints ?? data.history?.length ?? 0,
    startDate: data.startDate ?? data.history?.[0]?.date ?? "",
    endDate: data.endDate ?? data.history?.[data.history.length - 1]?.date ?? "",
  };
}

function main() {
  const index = loadIndex();
  const byTicker = new Map(index.map((entry) => [entry.ticker, entry]));
  const files = readdirSync(STOCKS_DIR).filter(
    (name) => name.endsWith(".json") && name !== "index.json"
  );

  let added = 0;
  for (const file of files) {
    const ticker = file.replace(/\.json$/, "");
    if (byTicker.has(ticker)) continue;

    try {
      const data = JSON.parse(readFileSync(join(STOCKS_DIR, file), "utf-8"));
      const entry = entryFromJson(ticker, data);
      byTicker.set(ticker, entry);
      added++;
    } catch (err) {
      console.warn(`⚠ ${ticker}: JSON 파싱 실패 —`, err.message);
    }
  }

  const merged = [...byTicker.values()].sort((a, b) =>
    a.ticker.localeCompare(b.ticker)
  );
  writeFileSync(INDEX_PATH, JSON.stringify(merged, null, 2));

  console.log(`✅ index.json 동기화 완료`);
  console.log(`   추가: ${added}개`);
  console.log(`   총: ${merged.length}개`);
}

main();
