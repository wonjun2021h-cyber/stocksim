/**
 * 유명 ETF + 배당주 추가 다운로더 (레버리지 제외)
 * Usage: node scripts/add-etf-dividend.mjs
 *
 * 대상: 시장 대표 ETF / 섹터 ETF / 배당 ETF / 채권 ETF / 국제 ETF / 유명 배당주
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const STOCKS_DIR = join(ROOT, "public", "data", "stocks");
const INDEX_PATH = join(STOCKS_DIR, "index.json");

const PERIOD1 = Math.floor(new Date("2014-01-01").getTime() / 1000);
const PERIOD2 = Math.floor(Date.now() / 1000);

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function randomSleep(min, max) { return sleep(Math.floor(Math.random() * (max - min + 1)) + min); }

// ────────────────────────────────────────────────────────────────
// 큐레이션 목록 (레버리지 완전 제외)
// ────────────────────────────────────────────────────────────────

const CURATED = [

  // ── 시장 대표 ETF ───────────────────────────────────────────
  { ticker: "SPY",  name: "SPDR S&P 500 ETF" },
  { ticker: "VOO",  name: "뱅가드 S&P500 ETF" },
  { ticker: "VTI",  name: "뱅가드 전체시장 ETF" },
  { ticker: "QQQ",  name: "인베스코 Nasdaq100 ETF" },
  { ticker: "SOXX", name: "iShares 반도체 ETF" },
  { ticker: "SMH",  name: "반에크 반도체 ETF" },
  { ticker: "IWM",  name: "iShares 러셀2000 ETF" },
  { ticker: "DIA",  name: "다우존스 산업평균 ETF" },
  { ticker: "MDY",  name: "S&P 중형주 ETF" },
  { ticker: "IJH",  name: "iShares S&P 중형주 ETF" },
  { ticker: "IJR",  name: "iShares S&P 소형주 ETF" },
  { ticker: "OEF",  name: "iShares S&P 100 ETF" },
  { ticker: "RSP",  name: "S&P 500 동일가중 ETF" },

  // ── 섹터 ETF (SPDR) ────────────────────────────────────────
  { ticker: "XLK",  name: "기술주 섹터 ETF" },
  { ticker: "XLF",  name: "금융 섹터 ETF" },
  { ticker: "XLV",  name: "헬스케어 섹터 ETF" },
  { ticker: "XLE",  name: "에너지 섹터 ETF" },
  { ticker: "XLI",  name: "산업재 섹터 ETF" },
  { ticker: "XLC",  name: "커뮤니케이션 섹터 ETF" },
  { ticker: "XLY",  name: "경기소비재 섹터 ETF" },
  { ticker: "XLP",  name: "필수소비재 섹터 ETF" },
  { ticker: "XLRE", name: "리츠 섹터 ETF" },
  { ticker: "XLU",  name: "유틸리티 섹터 ETF" },
  { ticker: "XLB",  name: "소재 섹터 ETF" },

  // ── 월배당·커버드콜 ETF (레버리지 아님) ───────────────────
  { ticker: "JEPI", name: "JPMorgan Equity Premium Income" },
  { ticker: "JEPQ", name: "JPMorgan Nasdaq Premium Income" },
  { ticker: "QQQI", name: "NEOS Nasdaq 100 High Income" },
  { ticker: "SPYI", name: "NEOS S&P 500 High Income" },
  { ticker: "QDVO", name: "Amplify CWP Growth & Income" },
  { ticker: "QDTE", name: "Amplify Nasdaq 100 Enhanced Dividend" },
  { ticker: "XYLD", name: "Global X S&P500 커버드콜" },
  { ticker: "QYLD", name: "Global X Nasdaq100 커버드콜" },
  { ticker: "RYLD", name: "Global X Russell2000 커버드콜" },
  { ticker: "DIVO", name: "Amplify CWP Enhanced Dividend" },
  { ticker: "NUSI", name: "Nationwide Nasdaq-100 Hedged Income" },
  { ticker: "JEPY", name: "Defiance S&P 500 Enhanced Options" },
  { ticker: "IWMI", name: "NEOS Russell 2000 High Income" },
  { ticker: "ISPY", name: "ProShares S&P 500 High Income" },
  { ticker: "IQQQ", name: "ProShares Nasdaq-100 High Income" },

  // ── 배당 ETF ──────────────────────────────────────────────
  { ticker: "SCHD", name: "슈왑 미국 배당주 ETF" },
  { ticker: "VYM",  name: "뱅가드 고배당 ETF" },
  { ticker: "HDV",  name: "iShares 핵심 고배당 ETF" },
  { ticker: "DVY",  name: "iShares 배당 선별 ETF" },
  { ticker: "VIG",  name: "뱅가드 배당성장 ETF" },
  { ticker: "DGRO", name: "iShares 배당성장 ETF" },
  { ticker: "NOBL", name: "ProShares 배당귀족 ETF" },
  { ticker: "SDY",  name: "S&P 배당귀족 ETF" },
  { ticker: "PEY",  name: "고배당률 ETF" },
  { ticker: "SPHD", name: "S&P 500 고배당 저변동 ETF" },
  { ticker: "DGRW", name: "배당성장 스마트베타 ETF" },

  // ── 성장 / 가치 / 팩터 ETF ─────────────────────────────────
  { ticker: "VUG",  name: "뱅가드 성장주 ETF" },
  { ticker: "VTV",  name: "뱅가드 가치주 ETF" },
  { ticker: "IVW",  name: "S&P 500 성장주 ETF" },
  { ticker: "IVE",  name: "S&P 500 가치주 ETF" },
  { ticker: "IWF",  name: "iShares 러셀1000 성장 ETF" },
  { ticker: "IWD",  name: "iShares 러셀1000 가치 ETF" },
  { ticker: "QUAL", name: "iShares 퀄리티 팩터 ETF" },
  { ticker: "MTUM", name: "iShares 모멘텀 팩터 ETF" },
  { ticker: "VLUE", name: "iShares 가치 팩터 ETF" },
  { ticker: "USMV", name: "iShares 저변동 ETF" },
  { ticker: "MOAT", name: "반에크 와이드모트 ETF" },
  { ticker: "PKW",  name: "자사주매입 ETF" },

  // ── 국제 선진국 ETF ───────────────────────────────────────
  { ticker: "VEA",  name: "뱅가드 선진시장 ETF" },
  { ticker: "EFA",  name: "iShares 선진국 ETF" },
  { ticker: "IEFA", name: "iShares 핵심 선진국 ETF" },
  { ticker: "ACWI", name: "iShares MSCI 전세계 ETF" },
  { ticker: "VT",   name: "뱅가드 전세계 주식 ETF" },
  { ticker: "VXUS", name: "뱅가드 미국 제외 전세계 ETF" },
  { ticker: "EWJ",  name: "iShares 일본 ETF" },
  { ticker: "EWG",  name: "iShares 독일 ETF" },
  { ticker: "EWU",  name: "iShares 영국 ETF" },
  { ticker: "EWA",  name: "iShares 호주 ETF" },
  { ticker: "EWC",  name: "iShares 캐나다 ETF" },
  { ticker: "EFAV", name: "iShares 선진국 최소변동 ETF" },
  { ticker: "IDIV", name: "선진국 배당 ETF" },

  // ── 신흥국 ETF ────────────────────────────────────────────
  { ticker: "VWO",  name: "뱅가드 신흥국 ETF" },
  { ticker: "EEM",  name: "iShares 신흥국 ETF" },
  { ticker: "IEMG", name: "iShares 핵심 신흥국 ETF" },
  { ticker: "EWT",  name: "iShares 대만 ETF" },
  { ticker: "EWZ",  name: "iShares 브라질 ETF" },
  { ticker: "FXI",  name: "iShares 중국 대형주 ETF" },
  { ticker: "MCHI", name: "iShares MSCI 중국 ETF" },
  { ticker: "KWEB", name: "KraneShares 중국 인터넷 ETF" },
  { ticker: "INDA", name: "iShares 인도 ETF" },
  { ticker: "EWY",  name: "iShares 한국 ETF" },

  // ── 채권 ETF ──────────────────────────────────────────────
  { ticker: "AGG",  name: "iShares 미국 종합 채권 ETF" },
  { ticker: "BND",  name: "뱅가드 미국 채권시장 ETF" },
  { ticker: "TLT",  name: "iShares 20년+ 미국채 ETF" },
  { ticker: "IEF",  name: "iShares 7-10년 미국채 ETF" },
  { ticker: "SHY",  name: "iShares 1-3년 미국채 ETF" },
  { ticker: "LQD",  name: "iShares 투자등급 회사채 ETF" },
  { ticker: "HYG",  name: "iShares 하이일드 회사채 ETF" },
  { ticker: "GOVT", name: "iShares 미국 국채 ETF" },
  { ticker: "TIP",  name: "iShares TIPS 채권 ETF" },
  { ticker: "VCIT", name: "뱅가드 중기 회사채 ETF" },
  { ticker: "VCSH", name: "뱅가드 단기 회사채 ETF" },
  { ticker: "MUB",  name: "iShares 지방채 ETF" },
  { ticker: "EMB",  name: "iShares 신흥국 달러채 ETF" },

  // ── 리츠 / 부동산 ETF ─────────────────────────────────────
  { ticker: "VNQ",  name: "뱅가드 리츠 ETF" },
  { ticker: "SCHH", name: "슈왑 미국 리츠 ETF" },
  { ticker: "RWR",  name: "SPDR 리츠 ETF" },

  // ── 금·원자재 ETF ─────────────────────────────────────────
  { ticker: "GLD",  name: "SPDR 금 ETF" },
  { ticker: "GLDM", name: "SPDR Gold MiniShares" },
  { ticker: "IAU",  name: "iShares 금 ETF" },
  { ticker: "SLV",  name: "iShares 은 ETF" },
  { ticker: "QLD",  name: "ProShares QQQ 2x ETF" },
  { ticker: "OKLO", name: "Oklo Inc" },
  { ticker: "GDX",  name: "반에크 금광 ETF" },
  { ticker: "GDXJ", name: "반에크 주니어 금광 ETF" },
  { ticker: "PDBC", name: "인베스코 원자재 ETF" },

  // ── 테마·혁신 ETF ─────────────────────────────────────────
  { ticker: "ARKK", name: "ARK Innovation ETF" },
  { ticker: "ARKG", name: "ARK Genomic Revolution ETF" },
  { ticker: "ARKW", name: "ARK Next Gen Internet ETF" },
  { ticker: "ARKF", name: "ARK Fintech Innovation ETF" },
  { ticker: "BOTZ", name: "글로벌X 로보틱스 AI ETF" },
  { ticker: "ROBO", name: "ROBO Global 로보틱스 ETF" },
  { ticker: "HACK", name: "사이버보안 ETF" },
  { ticker: "CLOU", name: "글로벌X 클라우드 컴퓨팅 ETF" },
  { ticker: "ICLN", name: "iShares 청정에너지 ETF" },
  { ticker: "TAN",  name: "인베스코 솔라 ETF" },
  { ticker: "CIBR", name: "퍼스트트러스트 사이버보안 ETF" },
  { ticker: "AIQ",  name: "글로벌X AI·빅데이터 ETF" },
  { ticker: "HERO", name: "글로벌X 비디오게임 ETF" },
  { ticker: "ESPO", name: "반에크 게이밍 ESports ETF" },
  { ticker: "AWAY", name: "여행·관광 ETF" },

  // ── 배당 귀족 / 고배당 개별주 (미국 ADR 포함) ──────────────
  // 에너지 배당
  { ticker: "ENB",  name: "엔브리지 (캐나다 파이프라인)" },
  { ticker: "TRP",  name: "TC에너지 (캐나다 파이프라인)" },
  { ticker: "CVE",  name: "Cenovus Energy" },
  { ticker: "SU",   name: "Suncor Energy" },
  { ticker: "CNQ",  name: "Canadian Natural Resources" },

  // 글로벌 석유·에너지
  { ticker: "SHEL", name: "쉘 (Shell)" },
  { ticker: "BP",   name: "BP" },
  { ticker: "TTE",  name: "토탈에너지 (TotalEnergies)" },
  { ticker: "E",    name: "에니 (Eni)" },
  { ticker: "RDS-B",name: "로열더치쉘 B" },

  // 글로벌 헬스케어 배당
  { ticker: "NVS",  name: "노바르티스" },
  { ticker: "NVO",  name: "노보노르디스크" },
  { ticker: "AZN",  name: "아스트라제네카" },
  { ticker: "GSK",  name: "GSK" },
  { ticker: "SNY",  name: "사노피" },
  { ticker: "RHHBY",name: "로슈 홀딩스 ADR" },
  { ticker: "BAYRY",name: "바이엘 ADR" },

  // 글로벌 소비재 배당
  { ticker: "UL",   name: "유니레버" },
  { ticker: "DEO",  name: "디아지오" },
  { ticker: "BTI",  name: "브리티시 아메리칸 타바코" },
  { ticker: "PM",   name: "필립모리스" },
  { ticker: "MO",   name: "알트리아" },
  { ticker: "UNH",  name: "유나이티드헬스 그룹" },

  // 글로벌 금융 배당
  { ticker: "BCS",  name: "바클레이즈" },
  { ticker: "HSBC", name: "HSBC 홀딩스" },
  { ticker: "ING",  name: "ING 그룹" },
  { ticker: "SAN",  name: "방코 산탄데르" },
  { ticker: "BBVA", name: "BBVA" },

  // 글로벌 통신 배당
  { ticker: "BCE",  name: "BCE (캐나다 통신)" },
  { ticker: "TEF",  name: "텔레포니카" },
  { ticker: "VOD",  name: "보다폰" },
  { ticker: "ORAN", name: "오렌지 (프랑스 통신)" },
  { ticker: "DTEGY",name: "도이치 텔레콤 ADR" },

  // 글로벌 소재·산업 배당
  { ticker: "RIO",  name: "리오 틴토" },
  { ticker: "BHP",  name: "BHP 그룹" },
  { ticker: "VALE", name: "발레 (브라질 철광석)" },
  { ticker: "NEM",  name: "뉴몬트 (금광)" },
  { ticker: "GOLD", name: "배릭골드" },
  { ticker: "ABX",  name: "배릭골드 (CA)" },

  // BDC (Business Development Company) — 고배당
  { ticker: "ARCC", name: "에이리스 캐피탈 (BDC)" },
  { ticker: "MAIN", name: "메인스트리트 캐피탈 (BDC)" },
  { ticker: "HTGC", name: "허큘레스 캐피탈 (BDC)" },
  { ticker: "GBDC", name: "골럽 캐피탈 (BDC)" },
  { ticker: "OBDC", name: "블루 오울 캐피탈 (BDC)" },
  { ticker: "PSEC", name: "프로스펙트 캐피탈 (BDC)" },

  // 배당 리츠 (미국)
  { ticker: "O",    name: "리얼티 인컴" },
  { ticker: "VICI", name: "VICI 프로퍼티즈" },
  { ticker: "NNN",  name: "National Retail Properties" },
  { ticker: "ADC",  name: "Agree Realty" },
  { ticker: "WPC",  name: "W.P. Carey" },
  { ticker: "STAG", name: "Stag Industrial" },
  { ticker: "EPR",  name: "EPR Properties" },
  { ticker: "OHI",  name: "Omega Healthcare (헬스케어 리츠)" },
  { ticker: "LTC",  name: "LTC Properties (헬스케어 리츠)" },
  { ticker: "GOOD", name: "Gladstone Commercial" },
  { ticker: "GAIN", name: "Gladstone Investment" },
  { ticker: "GLAD", name: "Gladstone Capital" },

  // 추가 유명 배당 개별주
  { ticker: "T",    name: "AT&T" },
  { ticker: "VZ",   name: "버라이즌" },
  { ticker: "IBM",  name: "IBM" },
  { ticker: "MMM",  name: "3M" },
  { ticker: "ED",   name: "Consolidated Edison" },
  { ticker: "D",    name: "도미니온 에너지" },
  { ticker: "SO",   name: "서던 컴퍼니" },
  { ticker: "DUK",  name: "듀크 에너지" },
  { ticker: "NEE",  name: "넥스트에라 에너지" },
  { ticker: "AEP",  name: "아메리칸 일렉트릭 파워" },
  { ticker: "XOM",  name: "엑슨모빌" },
  { ticker: "CVX",  name: "셰브론" },
  { ticker: "PG",   name: "P&G" },
  { ticker: "KO",   name: "코카콜라" },
  { ticker: "PEP",  name: "펩시코" },
  { ticker: "JNJ",  name: "존슨&존슨" },
  { ticker: "ABBV", name: "애브비" },
  { ticker: "MRK",  name: "머크" },
  { ticker: "PFE",  name: "화이자" },
  { ticker: "JPM",  name: "JP모건" },
  { ticker: "BAC",  name: "뱅크오브아메리카" },
  { ticker: "WFC",  name: "웰스파고" },
  { ticker: "USB",  name: "US 뱅코프" },
  { ticker: "AFL",  name: "애플락" },
  { ticker: "ALL",  name: "올스테이트" },
  { ticker: "PRU",  name: "프루덴셜" },
  { ticker: "MET",  name: "메트라이프" },
  { ticker: "GIS",  name: "제너럴밀스" },
  { ticker: "CPB",  name: "캠벨 수프" },
  { ticker: "K",    name: "켈라노바 (Kellogg)" },
  { ticker: "CL",   name: "콜게이트-팜올리브" },
  { ticker: "CLX",  name: "클로락스" },
  { ticker: "UNP",  name: "유니온퍼시픽" },
  { ticker: "WM",   name: "웨이스트 매니지먼트" },
  { ticker: "RSG",  name: "리퍼블릭 서비시스" },
  { ticker: "CAT",  name: "캐터필러" },
  { ticker: "DE",   name: "존 디어" },
  { ticker: "EMR",  name: "에머슨 일렉트릭" },
  { ticker: "GD",   name: "제너럴 다이나믹스" },
  { ticker: "LMT",  name: "록히드마틴" },
  { ticker: "RTX",  name: "레이시온 테크놀로지스" },
  { ticker: "NOC",  name: "노스롭 그루먼" },
];

// ────────────────────────────────────────────────────────────────
// Yahoo Finance 다운로드
// ────────────────────────────────────────────────────────────────

async function downloadHistory(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${PERIOD1}&period2=${PERIOD2}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
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
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
        points.push({ date: dateStr, close: Math.round(c * 100) / 100 });
      }
    }
    return points.length >= 30 ? points : null; // ETF는 30개만 돼도 허용
  } catch {
    return null;
  }
}

function isUptrendingStock(history) {
  if (!history || history.length < 100) return false;
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
  return positiveYears >= Math.floor(years.length * 0.6);
}

// ────────────────────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(STOCKS_DIR, { recursive: true });

  const index = existsSync(INDEX_PATH)
    ? JSON.parse(readFileSync(INDEX_PATH, "utf-8"))
    : [];
  const existingTickers = new Set(index.map((s) => s.ticker));

  // 중복 제거
  const targets = [];
  const seen = new Set();
  for (const s of CURATED) {
    const t = s.ticker.replace(/\./g, "-");
    if (!seen.has(t)) { seen.add(t); targets.push({ ...s, ticker: t }); }
  }

  const newTargets = targets.filter((s) => !existsSync(join(STOCKS_DIR, `${s.ticker}.json`)));
  console.log(`\n📋 큐레이션 목록: ${targets.length}개`);
  console.log(`✅ 이미 보유: ${targets.length - newTargets.length}개`);
  console.log(`⬇  신규 다운로드: ${newTargets.length}개\n`);

  let downloaded = 0, failed = 0;
  const failedList = [];

  for (let i = 0; i < newTargets.length; i++) {
    const { ticker, name } = newTargets[i];
    process.stdout.write(`\r[${String(i+1).padStart(3)}/${newTargets.length}] ⬇ ${ticker.padEnd(8)} ${name.slice(0,20).padEnd(20)} `);

    const history = await downloadHistory(ticker);

    // 청크(50개)마다 20~35초 휴식
    if ((i + 1) % 50 === 0 && i + 1 < newTargets.length) {
      const pause = Math.floor(Math.random() * 15000) + 20000;
      console.log(`\n\n⏸  50개 완료 — ${pause/1000}초 휴식...\n`);
      await sleep(pause);
    } else {
      await randomSleep(1000, 2500);
    }

    if (!history) {
      process.stdout.write(`❌ 실패\n`);
      failed++;
      failedList.push(ticker);
      continue;
    }

    const trending = isUptrendingStock(history);
    const stockData = {
      ticker, name,
      uptrending: trending,
      dataPoints: history.length,
      startDate: history[0]?.date,
      endDate: history[history.length - 1]?.date,
      startPrice: history[0]?.close,
      endPrice: history[history.length - 1]?.close,
      history,
    };
    writeFileSync(join(STOCKS_DIR, `${ticker}.json`), JSON.stringify(stockData));
    process.stdout.write(`✅ ${history.length}일치\n`);
    downloaded++;

    if (!existingTickers.has(ticker)) {
      index.push({ ticker, name, uptrending: trending, dataPoints: history.length, startDate: stockData.startDate, endDate: stockData.endDate });
      existingTickers.add(ticker);
    }

    if ((downloaded + failed) % 20 === 0) {
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
    }
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  console.log(`\n\n✅ 완료!`);
  console.log(`   다운로드 성공: ${downloaded}개`);
  console.log(`   실패: ${failed}개`);
  console.log(`   총 인덱스: ${index.length}개`);
  if (failedList.length) console.log(`   실패 목록: ${failedList.join(", ")}`);
}

main().catch(console.error);
