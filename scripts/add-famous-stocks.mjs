/**
 * 유명 ETF(월배당·커버드콜) + 인기 개별주 추가
 * 레버리지 ETF(TQQQ, SOXL 등) 제외
 * Usage: node scripts/add-famous-stocks.mjs
 *
 * S&P 대량 다운로드가 끝난 뒤 실행 권장 (Yahoo 속도 제한)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STOCKS_DIR = join(ROOT, "public", "data", "stocks");
const INDEX_PATH = join(STOCKS_DIR, "index.json");

const PERIOD1 = Math.floor(new Date("2014-01-01").getTime() / 1000);
const PERIOD2 = Math.floor(Date.now() / 1000);

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function randomSleep(min, max) { return sleep(Math.floor(Math.random() * (max - min + 1)) + min); }

const FAMOUS = [
  // 월배당·고배당 ETF
  { ticker: "JEPI", name: "JPMorgan Equity Premium Income" },
  { ticker: "JEPQ", name: "JPMorgan Nasdaq Premium Income" },
  { ticker: "QQQI", name: "NEOS Nasdaq 100 High Income" },
  { ticker: "SOXX", name: "iShares 반도체 ETF" },
  { ticker: "SMH",  name: "반에크 반도체 ETF" },
  { ticker: "QLD",  name: "ProShares QQQ 2x ETF" },
  { ticker: "GLDM", name: "SPDR Gold MiniShares" },
  { ticker: "SLV",  name: "iShares 은 ETF" },
  { ticker: "SPYI", name: "NEOS S&P 500 High Income" },
  { ticker: "OKLO", name: "Oklo (오클로)" },
  { ticker: "QDVO", name: "Amplify CWP Growth & Income" },
  { ticker: "QDTE", name: "Amplify Nasdaq 100 Enhanced Dividend" },
  { ticker: "XYLD", name: "Global X S&P500 커버드콜" },
  { ticker: "QYLD", name: "Global X Nasdaq100 커버드콜" },
  { ticker: "RYLD", name: "Global X Russell2000 커버드콜" },
  { ticker: "DIVO", name: "Amplify CWP Enhanced Dividend" },
  { ticker: "NUSI", name: "Nationwide Nasdaq Hedged Income" },
  { ticker: "JEPY", name: "Defiance S&P 500 Enhanced Options" },
  { ticker: "IWMI", name: "NEOS Russell 2000 High Income" },
  { ticker: "ISPY", name: "ProShares S&P 500 High Income" },
  { ticker: "IQQQ", name: "ProShares Nasdaq-100 High Income" },
  { ticker: "YMAX", name: "YieldMax Universe Fund of Option ETFs" },
  { ticker: "CONY", name: "YieldMax COIN Option Income" },
  { ticker: "NVDY", name: "YieldMax NVDA Option Income" },
  { ticker: "TSLY", name: "YieldMax TSLA Option Income" },
  { ticker: "AMZY", name: "YieldMax AMZN Option Income" },
  { ticker: "APLY", name: "YieldMax AAPL Option Income" },
  { ticker: "MSTY", name: "YieldMax MSTR Option Income" },

  // 빅테크·성장 (S&P 외·인기)
  { ticker: "PLTR", name: "팔란티어" },
  { ticker: "COIN", name: "코인베이스" },
  { ticker: "HOOD", name: "로빈후드" },
  { ticker: "ARM",  name: "ARM 홀딩스" },
  { ticker: "UBER", name: "우버" },
  { ticker: "LYFT", name: "리프트" },
  { ticker: "ABNB", name: "에어비앤비" },
  { ticker: "DASH", name: "도어대시" },
  { ticker: "SNAP", name: "스냅" },
  { ticker: "PINS", name: "핀터레스트" },
  { ticker: "RBLX", name: "로블록스" },
  { ticker: "DKNG", name: "드래프트킹" },
  { ticker: "XYZ",  name: "블록(구 Square)" },
  { ticker: "SHOP", name: "쇼피파이" },
  { ticker: "SNOW", name: "스노우플레이크" },
  { ticker: "NET",  name: "클라우드플레어" },
  { ticker: "DDOG", name: "Datadog" },
  { ticker: "MDB",  name: "MongoDB" },
  { ticker: "CRWD", name: "크라우드스트라이크" },
  { ticker: "ZS",   name: "Zscaler" },
  { ticker: "OKTA", name: "Okta" },
  { ticker: "U",    name: "Unity" },
  { ticker: "SOFI", name: "SoFi" },
  { ticker: "MSTR", name: "마이크로스트래티지" },
  { ticker: "SMCI", name: "슈퍼마이크로컴퓨터" },
  { ticker: "RIVN", name: "리비안" },
  { ticker: "LCID", name: "루시드" },
  { ticker: "NIO",  name: "니오" },
  { ticker: "XPEV", name: "샤오펑" },
  { ticker: "LI",   name: "리오토" },
  { ticker: "BABA", name: "알리바바" },
  { ticker: "JD",   name: "징동" },
  { ticker: "SE",   name: "씨앤드" },
  { ticker: "GRAB", name: "Grab" },

  // 블루칩·배당 인기주
  { ticker: "BRK-B", name: "버크셔 해서웨이 B" },
  { ticker: "WMT",  name: "월마트" },
  { ticker: "COST", name: "코스트코" },
  { ticker: "HD",   name: "홈디포" },
  { ticker: "LOW",  name: "로우스" },
  { ticker: "TGT",  name: "타겟" },
  { ticker: "DIS",  name: "디즈니" },
  { ticker: "NFLX", name: "넷플릭스" },
  { ticker: "CMCSA",name: "컴캐스트" },
  { ticker: "V",    name: "비자" },
  { ticker: "MA",   name: "마스터카드" },
  { ticker: "AXP",  name: "아메리칸익스프레스" },
  { ticker: "PYPL", name: "페이팔" },
  { ticker: "SQ",   name: "Square(구 티커)" },
  { ticker: "BA",   name: "보잉" },
  { ticker: "LMT",  name: "록히드마틴" },
  { ticker: "RTX",  name: "레이시온" },
  { ticker: "GE",   name: "GE" },
  { ticker: "F",    name: "포드" },
  { ticker: "GM",   name: "GM" },
  { ticker: "TM",   name: "도요타 ADR" },
  { ticker: "SONY", name: "소니 ADR" },
  { ticker: "TSM",  name: "TSMC ADR" },
  { ticker: "ASML", name: "ASML ADR" },
  { ticker: "LIN",  name: "Linde" },
  { ticker: "UNH",  name: "유나이티드헬스" },
  { ticker: "CVS",  name: "CVS" },
  { ticker: "WBA",  name: "월그린스" },
  { ticker: "SBUX", name: "스타벅스" },
  { ticker: "MCD",  name: "맥도날드" },
  { ticker: "NKE",  name: "나이키" },
  { ticker: "LULU", name: "룰루레몬" },
  { ticker: "TJX",  name: "TJX" },
  { ticker: "ORCL", name: "오라클" },
  { ticker: "CRM",  name: "세일즈포스" },
  { ticker: "ADBE", name: "어도비" },
  { ticker: "IBM",  name: "IBM" },
  { ticker: "INTC", name: "인텔" },
  { ticker: "QCOM", name: "퀄컴" },
  { ticker: "TXN",  name: "텍사스인스트루먼트" },
  { ticker: "MU",   name: "마이크론" },
  { ticker: "AMD",  name: "AMD" },
  { ticker: "AVGO", name: "브로드컴" },
  { ticker: "NOW",  name: "서비스나우" },
  { ticker: "PANW", name: "팔로알토네트웍스" },
  { ticker: "FTNT", name: "포티넷" },
];

async function downloadHistory(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${PERIOD1}&period2=${PERIOD2}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "application/json",
        Referer: "https://finance.yahoo.com/",
      },
      signal: AbortSignal.timeout(15000),
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
        points.push({
          date: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`,
          close: Math.round(c * 100) / 100,
        });
      }
    }
    return points.length >= 30 ? points : null;
  } catch {
    return null;
  }
}

function isUptrending(history) {
  if (!history || history.length < 100) return false;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted[sorted.length - 1].close <= sorted[0].close) return false;
  const yr = {};
  for (const p of sorted) {
    const y = p.date.slice(0, 4);
    if (!yr[y]) yr[y] = { s: p.close, e: p.close };
    yr[y].e = p.close;
  }
  const vals = Object.values(yr);
  return vals.filter((v) => v.e >= v.s).length >= Math.floor(vals.length * 0.6);
}

async function main() {
  mkdirSync(STOCKS_DIR, { recursive: true });
  const index = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, "utf-8")) : [];
  const existingTickers = new Set(index.map((s) => s.ticker));

  const seen = new Set();
  const targets = [];
  for (const s of FAMOUS) {
    const t = s.ticker.replace(/\./g, "-");
    if (seen.has(t)) continue;
    seen.add(t);
    if (!existsSync(join(STOCKS_DIR, `${t}.json`))) targets.push({ ...s, ticker: t });
  }

  console.log(`\n⭐ 유명 종목 큐레이션: ${FAMOUS.length}개`);
  console.log(`⬇  신규 다운로드: ${targets.length}개\n`);
  if (targets.length === 0) {
    console.log("모두 보유 중입니다.");
    return;
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const { ticker, name } = targets[i];
    process.stdout.write(`[${String(i + 1).padStart(3)}/${targets.length}] ${ticker.padEnd(7)} `);
    const history = await downloadHistory(ticker);
    await randomSleep(2000, 4000);

    if (!history) {
      process.stdout.write(`❌\n`);
      fail++;
      continue;
    }
    const trending = isUptrending(history);
    writeFileSync(
      join(STOCKS_DIR, `${ticker}.json`),
      JSON.stringify({
        ticker,
        name,
        uptrending: trending,
        dataPoints: history.length,
        startDate: history[0].date,
        endDate: history[history.length - 1].date,
        startPrice: history[0].close,
        endPrice: history[history.length - 1].close,
        history,
      })
    );
    process.stdout.write(`✅ ${history.length}일\n`);
    ok++;
    if (!existingTickers.has(ticker)) {
      index.push({
        ticker,
        name,
        uptrending: trending,
        dataPoints: history.length,
        startDate: history[0].date,
        endDate: history[history.length - 1].date,
      });
      existingTickers.add(ticker);
    }
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\n✅ 완료 — 성공 ${ok} / 실패 ${fail} / 총 인덱스 ${index.length}개`);
}

main().catch(console.error);
