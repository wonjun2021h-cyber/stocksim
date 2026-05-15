/**
 * Stock data downloader — S&P 500 + Nasdaq 100 + 우상향 필터
 * Node.js 18+ (native fetch)
 * Usage: node scripts/download-stocks.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "data", "stocks");
const INDEX_PATH = join(ROOT, "public", "data", "stocks", "index.json");

const PERIOD1 = Math.floor(new Date("2014-01-01").getTime() / 1000);
const PERIOD2 = Math.floor(Date.now() / 1000);
const DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. 티커 목록 수집 ─────────────────────────────────────────────────────────

async function fetchSP500() {
  console.log("📋 S&P 500 목록 다운로드 중...");
  const res = await fetch(
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
  );
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      return { ticker: cols[0]?.trim().replace(/"/g, ""), name: cols[1]?.trim().replace(/"/g, "") };
    })
    .filter((s) => s.ticker && s.name);
}

async function fetchNasdaq100() {
  console.log("📋 Nasdaq 100 목록 다운로드 중...");
  // Wikipedia API로 Nasdaq-100 구성 종목 파싱
  const res = await fetch(
    "https://en.wikipedia.org/w/api.php?action=parse&page=Nasdaq-100&prop=wikitext&format=json&origin=*"
  );
  const data = await res.json();
  const wikitext = data?.parse?.wikitext?.["*"] ?? "";
  const tickers = [];
  // wikitext에서 종목 코드 추출 (| AAPL || Apple 형태)
  const regex = /\|\s*([A-Z]{1,5})\s*\|\|/g;
  let m;
  while ((m = regex.exec(wikitext)) !== null) {
    const t = m[1].trim();
    if (t.length >= 1 && t.length <= 5) tickers.push(t);
  }

  // 파싱 실패 시 하드코딩 목록 사용
  if (tickers.length < 50) {
    console.log("  Wikipedia 파싱 실패, 하드코딩 목록 사용");
    return NASDAQ100_FALLBACK;
  }
  return tickers.map((t) => ({ ticker: t, name: t }));
}

// ── 2. Yahoo Finance 다운로드 ─────────────────────────────────────────────────

async function downloadHistory(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${PERIOD1}&period2=${PERIOD2}`;
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
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

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
    return points.length >= 100 ? points : null;
  } catch {
    return null;
  }
}

// ── 3. 우상향 판단 ────────────────────────────────────────────────────────────

function isUptrendingStock(history) {
  if (!history || history.length < 500) return false;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const startPrice = sorted[0].close;
  const endPrice = sorted[sorted.length - 1].close;

  // 기본 조건: 12년 후 가격이 시작가보다 높아야 함
  if (endPrice <= startPrice) return false;

  // 연도별 수익 확인: 12년 중 9년 이상 플러스
  const yearlyReturns = {};
  for (const p of sorted) {
    const year = p.date.substring(0, 4);
    if (!yearlyReturns[year]) yearlyReturns[year] = { start: p.close, end: p.close };
    yearlyReturns[year].end = p.close;
  }
  const years = Object.values(yearlyReturns);
  const positiveYears = years.filter((y) => y.end >= y.start).length;
  return positiveYears >= Math.floor(years.length * 0.75); // 75% 이상 연도가 플러스
}

// ── 4. 메인 실행 ──────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 기존 index 로드
  let index = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, "utf-8")) : [];
  const existingTickers = new Set(index.map((s) => s.ticker));

  // 티커 목록 수집
  const [sp500, nasdaq100raw] = await Promise.all([fetchSP500(), fetchNasdaq100()]);

  const nasdaq100 = Array.isArray(nasdaq100raw[0])
    ? nasdaq100raw
    : nasdaq100raw.map((t) => (typeof t === "string" ? { ticker: t, name: t } : t));

  // 기존 CSV의 13개 종목도 포함
  const existingCSVTickers = [
    { ticker: "GOOG", name: "구글" },
    { ticker: "AAPL", name: "애플" },
    { ticker: "MSFT", name: "마이크로소프트" },
    { ticker: "AMZN", name: "아마존" },
    { ticker: "META", name: "메타" },
    { ticker: "TSLA", name: "테슬라" },
    { ticker: "QQQ", name: "QQQ ETF" },
    { ticker: "SPY", name: "SPY ETF" },
    { ticker: "VOO", name: "뱅가드 S&P500 ETF" },
    { ticker: "LLY", name: "일라이 릴리" },
    { ticker: "NVDA", name: "엔비디아" },
  ];

  // 중복 제거 후 합치기
  const allMap = new Map();
  for (const s of [...existingCSVTickers, ...sp500, ...nasdaq100]) {
    const ticker = s.ticker?.replace(/\./g, "-"); // BRK.A → BRK-A
    if (ticker) allMap.set(ticker, s.name || ticker);
  }

  const allStocks = Array.from(allMap.entries()).map(([ticker, name]) => ({ ticker, name }));
  console.log(`\n📊 총 ${allStocks.size ?? allStocks.length}개 종목 처리 예정\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let uptrending = 0;

  for (let i = 0; i < allStocks.length; i++) {
    const { ticker, name } = allStocks[i];
    const filePath = join(OUT_DIR, `${ticker}.json`);

    // 이미 다운로드된 경우 스킵
    if (existsSync(filePath)) {
      skipped++;
      process.stdout.write(`\r[${i + 1}/${allStocks.length}] ✓ 스킵: ${ticker}                    `);
      continue;
    }

    process.stdout.write(`\r[${i + 1}/${allStocks.length}] ⬇ 다운로드: ${ticker}                    `);

    const history = await downloadHistory(ticker);
    await sleep(DELAY_MS);

    if (!history) {
      failed++;
      continue;
    }

    const trending = isUptrendingStock(history);
    if (trending) uptrending++;

    const stockData = {
      ticker,
      name,
      uptrending: trending,
      dataPoints: history.length,
      startDate: history[0]?.date,
      endDate: history[history.length - 1]?.date,
      startPrice: history[0]?.close,
      endPrice: history[history.length - 1]?.close,
      history,
    };

    writeFileSync(filePath, JSON.stringify(stockData));
    downloaded++;

    // index에 추가
    if (!existingTickers.has(ticker)) {
      index.push({
        ticker,
        name,
        uptrending: trending,
        dataPoints: history.length,
        startDate: history[0]?.date,
        endDate: history[history.length - 1]?.date,
      });
      existingTickers.add(ticker);
    }

    // 매 50개마다 index 저장
    if ((downloaded + skipped) % 50 === 0) {
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
    }
  }

  // 최종 index 저장
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log(`\n\n✅ 완료!`);
  console.log(`   다운로드: ${downloaded}개`);
  console.log(`   스킵(기존): ${skipped}개`);
  console.log(`   실패: ${failed}개`);
  console.log(`   우상향 종목: ${uptrending}개`);
  console.log(`   저장 위치: ${OUT_DIR}`);
}

main().catch(console.error);

// ── Nasdaq 100 하드코딩 폴백 ──────────────────────────────────────────────────
const NASDAQ100_FALLBACK = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","COST",
  "NFLX","AMD","ADBE","QCOM","PEP","INTC","INTU","AMAT","CSCO","TXN",
  "AMGN","ISRG","BKNG","VRTX","ADP","MU","LRCX","PANW","ADI","KLAC",
  "REGN","MDLZ","GILD","SNPS","CDNS","MRVL","PYPL","MAR","MNST","CTAS",
  "ORLY","FTNT","CPRT","PCAR","PAYX","KDP","MCHP","DXCM","ROST","IDXX",
  "CEG","EXC","FANG","FAST","ODFL","VRSK","GEHC","ON","ZS","TEAM",
  "BIIB","DLTR","CTSH","ANSS","EBAY","SGEN","ENPH","ZM","LCID","RIVN",
  "WBD","ILMN","MRNA","DDOG","CRWD","OKTA","ABNB","MELI","ASML","TTD",
  "WDAY","NXPI","ALGN","MTCH","SIRI","DOCU","JD","BIDU","PDD","NTES",
  "WBA","SPLK","SWKS","VRSN","NTAP","XLNX","LULU","TCOM","INCY","BMRN",
].map((t) => ({ ticker: t, name: t }));
