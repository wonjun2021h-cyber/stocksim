/**
 * 슬라이딩 윈도우 방식 주식 데이터 갱신
 * Usage: node scripts/refresh-stocks.mjs
 *
 * 동작 원리:
 *   1. 각 종목의 마지막 날짜 이후 ~ 오늘까지 새 일봉 다운로드
 *   2. 새 데이터 N개 추가 → 맨 앞(가장 오래된) N개 제거
 *   3. 항상 최초 dataPoints 개수(≒12년치)를 유지
 *   4. index.json 메타데이터(startDate, endDate, dataPoints) 업데이트
 *
 * 권장 실행: 미국 장 마감 후 (한국시간 기준 새벽 5시 이후)
 * 스케줄 예시 (Windows 작업 스케줄러):
 *   매일 오전 6시: node C:\...\stocksim\scripts\refresh-stocks.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STOCKS_DIR = join(ROOT, "public", "data", "stocks");
const INDEX_PATH = join(STOCKS_DIR, "index.json");

const DELAY_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Yahoo Finance에서 특정 기간 일봉 다운로드 ──────────────────────────────

async function fetchRange(ticker, fromDate, toDate) {
  const period1 = Math.floor(new Date(fromDate).getTime() / 1000);
  const period2 = Math.floor(new Date(toDate).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${period1}&period2=${period2}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c != null && isFinite(c) && c > 0) {
        const d = new Date(timestamps[i] * 1000);
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        points.push({ date: dateStr, close: Math.round(c * 100) / 100 });
      }
    }
    return points;
  } catch {
    return [];
  }
}

// ── 우상향 판단 (기존 로직 동일) ───────────────────────────────────────────

function isUptrendingStock(history) {
  if (!history || history.length < 500) return false;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const startPrice = sorted[0].close;
  const endPrice = sorted[sorted.length - 1].close;
  if (endPrice <= startPrice) return false;

  const yearlyReturns = {};
  for (const p of sorted) {
    const year = p.date.substring(0, 4);
    if (!yearlyReturns[year]) yearlyReturns[year] = { start: p.close, end: p.close };
    yearlyReturns[year].end = p.close;
  }
  const years = Object.values(yearlyReturns);
  const positiveYears = years.filter((y) => y.end >= y.start).length;
  return positiveYears >= Math.floor(years.length * 0.75);
}

// ── 메인 ───────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(INDEX_PATH)) {
    console.error("❌ index.json 없음:", INDEX_PATH);
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  const today = new Date().toISOString().split("T")[0];

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let noNew = 0;

  console.log(`\n📅 오늘: ${today}`);
  console.log(`📊 갱신 대상: ${index.length}개 종목\n`);

  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    const { ticker } = entry;
    const filePath = join(STOCKS_DIR, `${ticker}.json`);

    process.stdout.write(
      `\r[${String(i + 1).padStart(3)}/${index.length}] ${ticker.padEnd(6)} `
    );

    if (!existsSync(filePath)) {
      process.stdout.write(`⚠ 파일 없음 (스킵)`);
      skipped++;
      continue;
    }

    let stock;
    try {
      stock = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      process.stdout.write(`⚠ 파싱 오류 (스킵)`);
      skipped++;
      continue;
    }

    const lastDate = stock.history?.[stock.history.length - 1]?.date;
    if (!lastDate) {
      skipped++;
      continue;
    }

    // 마지막 날짜 다음 날부터 오늘까지 요청
    const nextDay = new Date(lastDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const fromDate = nextDay.toISOString().split("T")[0];

    if (fromDate > today) {
      process.stdout.write(`✓ 최신`);
      noNew++;
      continue;
    }

    const newPoints = await fetchRange(ticker, fromDate, today);
    await sleep(DELAY_MS);

    // 기존 날짜 Set (중복 방지)
    const existingDates = new Set(stock.history.map((p) => p.date));
    const uniqueNew = newPoints.filter((p) => !existingDates.has(p.date));

    if (uniqueNew.length === 0) {
      process.stdout.write(`✓ 신규 없음`);
      noNew++;
      continue;
    }

    const originalLength = stock.history.length;

    // 새 데이터 추가
    stock.history.push(...uniqueNew);

    // 같은 수만큼 맨 앞(가장 오래된) 데이터 제거 → 길이 유지
    if (stock.history.length > originalLength) {
      const excess = stock.history.length - originalLength;
      stock.history.splice(0, excess);
    }

    // 날짜 오름차순 정렬 보장
    stock.history.sort((a, b) => a.date.localeCompare(b.date));

    // 메타데이터 업데이트
    stock.dataPoints = stock.history.length;
    stock.startDate = stock.history[0].date;
    stock.endDate = stock.history[stock.history.length - 1].date;
    stock.startPrice = stock.history[0].close;
    stock.endPrice = stock.history[stock.history.length - 1].close;
    stock.uptrending = isUptrendingStock(stock.history);

    // 파일 저장
    try {
      writeFileSync(filePath, JSON.stringify(stock));
    } catch (e) {
      process.stdout.write(`❌ 저장 실패`);
      failed++;
      continue;
    }

    // index 업데이트
    entry.dataPoints = stock.dataPoints;
    entry.startDate = stock.startDate;
    entry.endDate = stock.endDate;
    entry.uptrending = stock.uptrending;

    process.stdout.write(`✅ +${uniqueNew.length}일 추가, -${uniqueNew.length}일 제거`);
    updated++;

    // 매 100개마다 index 중간 저장
    if ((i + 1) % 100 === 0) {
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
    }
  }

  // 최종 index 저장
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log(`\n\n✅ 갱신 완료!`);
  console.log(`   업데이트: ${updated}개`);
  console.log(`   이미 최신: ${noNew}개`);
  console.log(`   파일 없음/오류 스킵: ${skipped}개`);
  console.log(`   저장 실패: ${failed}개`);
  console.log(`   기준일: ${today}`);
}

main().catch(console.error);
