/**
 * 슬라이딩 윈도우 방식 주식 데이터 갱신 (IP 차단 방어 강화판)
 * Usage: node scripts/refresh-stocks.mjs
 *
 * 동작 원리:
 *   1. 각 종목의 마지막 날짜 이후 ~ 오늘까지 새 일봉 다운로드
 *   2. 새 데이터 N개 추가 → 맨 앞(가장 오래된) N개 제거
 *   3. 항상 최초 dataPoints 개수(≒12년치)를 유지
 *   4. index.json 메타데이터(startDate, endDate, dataPoints) 업데이트
 *
 * IP 차단 방어:
 *   - 종목 간 1~3초 무작위 지연
 *   - 50개 처리마다 30~60초 청크 휴식
 *   - 무작위 User-Agent 로테이션
 *   - 실패 종목 Exponential Backoff 방식 3회 재시도
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
const ENV_PATH = join(ROOT, ".env");

// .env 로드 (DISCORD_WEBHOOK_URL 등)
function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── 상수 ───────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 50;           // 청크 단위 (종목 수)
const CHUNK_PAUSE_MIN = 30_000;  // 청크 간 최소 휴식 (ms)
const CHUNK_PAUSE_MAX = 60_000;  // 청크 간 최대 휴식 (ms)
const TICK_DELAY_MIN = 1_000;    // 종목 간 최소 지연 (ms)
const TICK_DELAY_MAX = 3_000;    // 종목 간 최대 지연 (ms)
const MAX_RETRIES = 3;           // 실패 종목 최대 재시도 횟수
const FETCH_TIMEOUT = 15_000;    // 요청 타임아웃 (ms)

// 실제 브라우저 User-Agent 풀 — 요청마다 무작위 선택
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** min~max 사이 무작위 정수 ms 대기 */
function randomSleep(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(ms);
}

/** UA_POOL에서 무작위 User-Agent 반환 */
function randomUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

/** Discord 웹훅 알림 (.env에 DISCORD_WEBHOOK_URL 설정 필요) */
async function sendDiscordAlert(title, details = "") {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const content = details
    ? `**${title}**\n${details}`
    : `**${title}**`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "StockSim",
        content: content.slice(0, 2000),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`⚠ Discord 알림 실패: HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn(`⚠ Discord 알림 전송 오류: ${e.message}`);
  }
}

// ── Yahoo Finance에서 특정 기간 일봉 다운로드 ──────────────────────────────

async function fetchRange(ticker, fromDate, toDate) {
  const period1 = Math.floor(new Date(fromDate).getTime() / 1000);
  const period2 = Math.floor(new Date(toDate).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${period1}&period2=${period2}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://finance.yahoo.com/",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return null; // null = 재시도 대상

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
    return null; // null = 재시도 대상
  }
}

/**
 * Exponential Backoff 방식 재시도 래퍼.
 * fetchRange가 null을 반환하면 실패로 간주, 최대 maxRetries회 재시도.
 * 재시도 간격: 5s → 10s → 20s (2배씩)
 */
async function fetchRangeWithRetry(ticker, fromDate, toDate, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  let backoffMs = 5_000;

  while (attempt <= maxRetries) {
    const result = await fetchRange(ticker, fromDate, toDate);

    if (result !== null) return { success: true, points: result };

    attempt++;
    if (attempt > maxRetries) break;

    console.log(
      `\n  ⚠ ${ticker} 재시도 ${attempt}/${maxRetries} (${backoffMs / 1000}s 후)...`
    );
    await sleep(backoffMs);
    backoffMs *= 2; // Exponential Backoff
  }

  return { success: false, points: [] };
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

// ── 단일 종목 갱신 (성공 여부 반환) ──────────────────────────────────────

async function refreshTicker(ticker, entry, today) {
  const filePath = join(STOCKS_DIR, `${ticker}.json`);

  if (!existsSync(filePath)) return { status: "skipped", reason: "파일 없음" };

  let stock;
  try {
    stock = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return { status: "skipped", reason: "파싱 오류" };
  }

  const lastDate = stock.history?.[stock.history.length - 1]?.date;
  if (!lastDate) return { status: "skipped", reason: "history 없음" };

  const nextDay = new Date(lastDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const fromDate = nextDay.toISOString().split("T")[0];

  if (fromDate > today) return { status: "noNew" };

  const { success, points: newPoints } = await fetchRangeWithRetry(ticker, fromDate, today);

  if (!success) {
    return { status: "failed", reason: "API 요청 실패 (차단·네트워크 가능)" };
  }

  const existingDates = new Set(stock.history.map((p) => p.date));
  const uniqueNew = newPoints.filter((p) => !existingDates.has(p.date));

  if (uniqueNew.length === 0) return { status: "noNew" };

  const originalLength = stock.history.length;

  stock.history.push(...uniqueNew);

  // 추가한 만큼 맨 앞 제거 → 길이 유지
  if (stock.history.length > originalLength) {
    stock.history.splice(0, stock.history.length - originalLength);
  }

  stock.history.sort((a, b) => a.date.localeCompare(b.date));

  stock.dataPoints  = stock.history.length;
  stock.startDate   = stock.history[0].date;
  stock.endDate     = stock.history[stock.history.length - 1].date;
  stock.startPrice  = stock.history[0].close;
  stock.endPrice    = stock.history[stock.history.length - 1].close;
  stock.uptrending  = isUptrendingStock(stock.history);

  try {
    writeFileSync(filePath, JSON.stringify(stock));
  } catch {
    return { status: "failed", reason: "저장 실패" };
  }

  entry.dataPoints = stock.dataPoints;
  entry.startDate  = stock.startDate;
  entry.endDate    = stock.endDate;
  entry.uptrending = stock.uptrending;

  return { status: "updated", added: uniqueNew.length };
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
  let noNew   = 0;
  const failedTickers = []; // { ticker, entry } — 최종 실패 목록

  console.log(`\n📅 오늘: ${today}`);
  console.log(`📊 갱신 대상: ${index.length}개 종목`);
  console.log(`⚙  청크: ${CHUNK_SIZE}개 / 청크 휴식: ${CHUNK_PAUSE_MIN/1000}~${CHUNK_PAUSE_MAX/1000}초 / 종목 지연: ${TICK_DELAY_MIN/1000}~${TICK_DELAY_MAX/1000}초\n`);

  // ── 1차 순회 ────────────────────────────────────────────────────────────
  for (let i = 0; i < index.length; i++) {
    const entry  = index[i];
    const { ticker } = entry;

    process.stdout.write(
      `\r[${String(i + 1).padStart(3)}/${index.length}] ${ticker.padEnd(6)} `
    );

    const result = await refreshTicker(ticker, entry, today);

    if (result.status === "updated") {
      process.stdout.write(`✅ +${result.added}일 추가`);
      updated++;
    } else if (result.status === "noNew") {
      process.stdout.write(`✓ 최신`);
      noNew++;
    } else if (result.status === "skipped") {
      process.stdout.write(`⚠ 스킵 (${result.reason})`);
      skipped++;
    } else {
      // status === "failed"
      process.stdout.write(`❌ 실패 (${result.reason})`);
      failedTickers.push({ ticker, entry });
    }

    // 청크 단위 휴식 (마지막 종목은 제외)
    const processed = i + 1;
    if (processed % CHUNK_SIZE === 0 && processed < index.length) {
      const pauseMs = Math.floor(
        Math.random() * (CHUNK_PAUSE_MAX - CHUNK_PAUSE_MIN + 1)
      ) + CHUNK_PAUSE_MIN;
      console.log(
        `\n\n⏸  [청크 ${Math.floor(processed / CHUNK_SIZE)}/${Math.ceil(index.length / CHUNK_SIZE)}] ` +
        `${CHUNK_SIZE}개 완료 — ${pauseMs / 1000}초 휴식 중...\n`
      );
      await sleep(pauseMs);
    } else {
      // 종목 간 무작위 지연 (최신 상태인 경우는 짧게)
      if (result.status !== "noNew") {
        await randomSleep(TICK_DELAY_MIN, TICK_DELAY_MAX);
      }
    }

    // 매 100개마다 index 중간 저장
    if (processed % 100 === 0) {
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
    }
  }

  // ── 실패 종목 재시도 (최대 MAX_RETRIES회, Exponential Backoff) ──────────
  if (failedTickers.length > 0) {
    console.log(`\n\n🔁 실패 종목 재시도: ${failedTickers.length}개`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const remaining = [];
      const backoffMs = 5_000 * Math.pow(2, attempt - 1); // 5s → 10s → 20s

      console.log(`\n  ▶ 재시도 ${attempt}/${MAX_RETRIES} (${backoffMs / 1000}초 대기 후)\n`);
      await sleep(backoffMs);

      for (const { ticker, entry } of failedTickers) {
        process.stdout.write(`  [재시도] ${ticker.padEnd(6)} `);
        const result = await refreshTicker(ticker, entry, today);

        if (result.status === "updated") {
          process.stdout.write(`✅ +${result.added}일\n`);
          updated++;
        } else if (result.status === "noNew") {
          process.stdout.write(`✓ 최신\n`);
          noNew++;
        } else {
          process.stdout.write(`❌ 재시도 실패\n`);
          remaining.push({ ticker, entry });
        }

        await randomSleep(TICK_DELAY_MIN, TICK_DELAY_MAX);
      }

      failedTickers.length = 0;
      failedTickers.push(...remaining);
      if (failedTickers.length === 0) break;
    }
  }

  // 최종 index 저장
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log(`\n\n✅ 갱신 완료!`);
  console.log(`   업데이트: ${updated}개`);
  console.log(`   이미 최신: ${noNew}개`);
  console.log(`   파일 없음/오류 스킵: ${skipped}개`);
  if (failedTickers.length > 0) {
    const list = failedTickers.map((f) => f.ticker).join(", ");
    console.log(`   최종 실패 (${failedTickers.length}개): ${list}`);
    await sendDiscordAlert(
      "⚠️ 주식 크롤링 실패",
      `기준일: ${today}\n실패 ${failedTickers.length}개\n\`\`\`${list}\`\`\``
    );
  } else if (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_NOTIFY_SUCCESS === "1") {
    await sendDiscordAlert(
      "✅ 주식 크롤링 완료",
      `기준일: ${today}\n업데이트: ${updated}개 · 최신: ${noNew}개 · 스킵: ${skipped}개`
    );
  }
  console.log(`   기준일: ${today}`);
}

main().catch(async (err) => {
  console.error(err);
  await sendDiscordAlert(
    "🚨 주식 크롤링 스크립트 오류",
    `${err?.message ?? err}`
  );
  process.exit(1);
});
