/**
 * 실패한 ETF/종목 재시도 스크립트
 * Usage: node scripts/retry-failed.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, "..");
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

// 이전에 실패한 목록
const FAILED = [
  "VTI","DIA","MDY","IJH","IJR","RSP","XLK","XLF","XLI","XLC","XLY","XLRE","XLU",
  "SCHD","DVY","VIG","SDY","SPHD","DGRW","VUG","VTV","IVW","IVE","IWF","IWD",
  "QUAL","MTUM","VLUE","USMV","PKW","IEFA","VT","VXUS","EWJ","EWG","EWU","EWA","EWC",
  "EFAV","IDIV","VWO","IEMG","FXI","MCHI","KWEB","INDA","EWY","AGG","BND","LQD",
  "HYG","GOVT","TIP","VCIT","VCSH","MUB","SCHH","GLD","SLV","GDX","GDXJ","PDBC",
  "ARKK","BOTZ","ROBO","HACK","CLOU","ICLN","TAN","CIBR","AIQ","TRP","CVE","SU",
  "SHEL","BP","TTE","E","NVS","AZN","GSK","SNY","RHHBY","UL","DEO","HSBC","SAN",
  "BBVA","BCE","TEF","ORAN","DTEGY","RIO","VALE","GOLD","ABX","ARCC","GBDC","OBDC",
  "PSEC","NNN","WPC","STAG","OHI","GOOD","GAIN","GLAD","K",
];

// 티커별 한국어 이름 매핑
const NAMES = {
  VTI:"뱅가드 전체시장 ETF", DIA:"다우존스 ETF", MDY:"S&P 중형주 ETF",
  IJH:"iShares S&P 중형주 ETF", IJR:"iShares S&P 소형주 ETF", RSP:"S&P500 동일가중 ETF",
  XLK:"기술주 섹터 ETF", XLF:"금융 섹터 ETF", XLI:"산업재 섹터 ETF",
  XLC:"커뮤니케이션 섹터 ETF", XLY:"경기소비재 섹터 ETF", XLRE:"리츠 섹터 ETF",
  XLU:"유틸리티 섹터 ETF", SCHD:"슈왑 배당주 ETF", DVY:"iShares 배당 선별 ETF",
  VIG:"뱅가드 배당성장 ETF", SDY:"S&P 배당귀족 ETF", SPHD:"S&P500 고배당 ETF",
  DGRW:"배당성장 스마트베타 ETF", VUG:"뱅가드 성장주 ETF", VTV:"뱅가드 가치주 ETF",
  IVW:"S&P500 성장주 ETF", IVE:"S&P500 가치주 ETF", IWF:"러셀1000 성장 ETF",
  IWD:"러셀1000 가치 ETF", QUAL:"iShares 퀄리티 ETF", MTUM:"iShares 모멘텀 ETF",
  VLUE:"iShares 가치 팩터 ETF", USMV:"iShares 저변동 ETF", PKW:"자사주매입 ETF",
  IEFA:"iShares 핵심 선진국 ETF", VT:"뱅가드 전세계 ETF", VXUS:"뱅가드 미국외 전세계 ETF",
  EWJ:"iShares 일본 ETF", EWG:"iShares 독일 ETF", EWU:"iShares 영국 ETF",
  EWA:"iShares 호주 ETF", EWC:"iShares 캐나다 ETF", EFAV:"iShares 선진국 최소변동 ETF",
  IDIV:"선진국 배당 ETF", VWO:"뱅가드 신흥국 ETF", IEMG:"iShares 핵심 신흥국 ETF",
  FXI:"iShares 중국 대형주 ETF", MCHI:"iShares MSCI 중국 ETF", KWEB:"중국 인터넷 ETF",
  INDA:"iShares 인도 ETF", EWY:"iShares 한국 ETF", AGG:"iShares 미국 종합채권 ETF",
  BND:"뱅가드 미국 채권시장 ETF", LQD:"iShares 투자등급 회사채 ETF",
  HYG:"iShares 하이일드 회사채 ETF", GOVT:"iShares 미국 국채 ETF",
  TIP:"iShares TIPS 채권 ETF", VCIT:"뱅가드 중기 회사채 ETF",
  VCSH:"뱅가드 단기 회사채 ETF", MUB:"iShares 지방채 ETF", SCHH:"슈왑 미국 리츠 ETF",
  GLD:"SPDR 금 ETF", SLV:"iShares 은 ETF", GDX:"반에크 금광 ETF",
  GDXJ:"반에크 주니어 금광 ETF", PDBC:"인베스코 원자재 ETF",
  ARKK:"ARK Innovation ETF", BOTZ:"글로벌X 로보틱스 AI ETF",
  ROBO:"ROBO Global 로보틱스 ETF", HACK:"사이버보안 ETF", CLOU:"글로벌X 클라우드 ETF",
  ICLN:"iShares 청정에너지 ETF", TAN:"인베스코 솔라 ETF",
  CIBR:"퍼스트트러스트 사이버보안 ETF", AIQ:"글로벌X AI·빅데이터 ETF",
  TRP:"TC에너지 (캐나다)", CVE:"Cenovus Energy", SU:"Suncor Energy",
  SHEL:"쉘 (Shell)", BP:"BP", TTE:"토탈에너지", E:"에니 (Eni)",
  NVS:"노바르티스", AZN:"아스트라제네카", GSK:"GSK", SNY:"사노피",
  RHHBY:"로슈 홀딩스 ADR", UL:"유니레버", DEO:"디아지오",
  HSBC:"HSBC 홀딩스", SAN:"방코 산탄데르", BBVA:"BBVA",
  BCE:"BCE (캐나다 통신)", TEF:"텔레포니카", ORAN:"오렌지",
  DTEGY:"도이치 텔레콤 ADR", RIO:"리오 틴토", VALE:"발레",
  GOLD:"배릭골드", ABX:"배릭골드 CA", ARCC:"에이리스 캐피탈 BDC",
  GBDC:"골럽 캐피탈 BDC", OBDC:"블루오울 캐피탈 BDC", PSEC:"프로스펙트 캐피탈 BDC",
  NNN:"National Retail Properties", WPC:"W.P. Carey", STAG:"Stag Industrial",
  OHI:"Omega Healthcare 리츠", GOOD:"Gladstone Commercial",
  GAIN:"Gladstone Investment", GLAD:"Gladstone Capital", K:"켈라노바",
};

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
      signal: AbortSignal.timeout(20000),
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
  } catch { return null; }
}

function isUptrending(history) {
  if (!history || history.length < 100) return false;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted[sorted.length-1].close <= sorted[0].close) return false;
  const yr = {};
  for (const p of sorted) {
    const y = p.date.slice(0,4);
    if (!yr[y]) yr[y] = { s: p.close, e: p.close };
    yr[y].e = p.close;
  }
  const vals = Object.values(yr);
  return vals.filter(v => v.e >= v.s).length >= Math.floor(vals.length * 0.6);
}

async function main() {
  const index = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH,"utf-8")) : [];
  const existingTickers = new Set(index.map(s => s.ticker));

  // 이미 받은 것 제외
  const targets = FAILED.filter(t => !existsSync(join(STOCKS_DIR, `${t}.json`)));
  console.log(`\n🔁 재시도 대상: ${targets.length}개 (이미 보유: ${FAILED.length - targets.length}개)`);
  console.log(`⏳ 60초 대기 후 시작 (Yahoo 쿨다운)...\n`);
  await sleep(60000);

  let ok = 0, fail = 0;
  const stillFailed = [];

  for (let i = 0; i < targets.length; i++) {
    const ticker = targets[i];
    const name = NAMES[ticker] || ticker;
    process.stdout.write(`[${String(i+1).padStart(3)}/${targets.length}] ${ticker.padEnd(8)} ${name.slice(0,24).padEnd(24)} `);

    const history = await downloadHistory(ticker);

    if ((i + 1) % 30 === 0 && i + 1 < targets.length) {
      const pause = 30000 + Math.floor(Math.random() * 20000);
      console.log(`\n⏸  30개 완료 — ${(pause/1000).toFixed(0)}초 휴식...\n`);
      await sleep(pause);
    } else {
      await randomSleep(2500, 5000); // 더 긴 딜레이로 재시도
    }

    if (!history) {
      process.stdout.write(`❌\n`);
      fail++;
      stillFailed.push(ticker);
      continue;
    }

    const trending = isUptrending(history);
    writeFileSync(join(STOCKS_DIR, `${ticker}.json`), JSON.stringify({
      ticker, name, uptrending: trending,
      dataPoints: history.length,
      startDate: history[0].date, endDate: history[history.length-1].date,
      startPrice: history[0].close, endPrice: history[history.length-1].close,
      history,
    }));
    process.stdout.write(`✅ ${history.length}일\n`);
    ok++;

    if (!existingTickers.has(ticker)) {
      index.push({ ticker, name, uptrending: trending, dataPoints: history.length, startDate: history[0].date, endDate: history[history.length-1].date });
      existingTickers.add(ticker);
    }
    if (ok % 15 === 0) writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\n✅ 재시도 완료! 성공: ${ok}개 / 실패: ${fail}개 / 총: ${index.length}개`);
  if (stillFailed.length) console.log(`   여전히 실패: ${stillFailed.join(", ")}`);
}

main().catch(console.error);
