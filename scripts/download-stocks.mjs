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
const DELAY_MS = 800;

// UA 풀 (IP 차단 방어)
const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];
function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function randomSleep(min, max) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

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
  try {
    const res = await fetch(
      "https://en.wikipedia.org/w/api.php?action=parse&page=Nasdaq-100&prop=wikitext&format=json&origin=*"
    );
    const data = await res.json();
    const wikitext = data?.parse?.wikitext?.["*"] ?? "";
    const tickers = [];
    const regex = /\|\s*([A-Z]{1,5})\s*\|\|/g;
    let m;
    while ((m = regex.exec(wikitext)) !== null) {
      const t = m[1].trim();
      if (t.length >= 1 && t.length <= 5) tickers.push(t);
    }
    if (tickers.length >= 50) return tickers.map((t) => ({ ticker: t, name: t }));
  } catch {}
  console.log("  Wikipedia 파싱 실패, 하드코딩 목록 사용");
  return NASDAQ100_FALLBACK;
}

/** Wikipedia HTML 테이블에서 종목 긁기 (S&P 400 / S&P 600 공용) */
async function fetchWikiStockList(pageTitle, label) {
  console.log(`📋 ${label} 목록 다운로드 중...`);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    const wikitext = data?.parse?.wikitext?.["*"] ?? "";

    const tickers = new Set();
    // 위키 테이블 행: | TICKER || ...
    const re1 = /\|\s*\[\[([A-Z]{1,5})(?:\|[^\]]+)?\]\]/g;
    const re2 = /\|\s*([A-Z]{1,5})\s*\n/g;
    let m;
    while ((m = re1.exec(wikitext)) !== null) tickers.add(m[1].trim());
    while ((m = re2.exec(wikitext)) !== null) {
      const t = m[1].trim();
      if (t.length >= 1 && t.length <= 5) tickers.add(t);
    }

    if (tickers.size >= 50) {
      console.log(`  ✓ ${tickers.size}개 파싱 성공`);
      return [...tickers].map((t) => ({ ticker: t, name: t }));
    }
  } catch (e) {
    console.log(`  ⚠ Wikipedia 파싱 오류: ${e.message}`);
  }

  // 폴백: GitHub datasets
  try {
    const fallbackUrl = pageTitle.includes("400")
      ? "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
      : null;
    if (!fallbackUrl) throw new Error("no fallback");
    // 이미 SP500에서 처리하므로 빈 배열 반환
    console.log(`  ⚠ ${label} 파싱 실패, 하드코딩 폴백 사용`);
  } catch {}

  // 최후 하드코딩 폴백
  if (pageTitle.includes("400")) return SP400_FALLBACK;
  if (pageTitle.includes("600")) return SP600_FALLBACK;
  return [];
}

// ── 2. Yahoo Finance 다운로드 ─────────────────────────────────────────────────

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

  // 티커 목록 수집 (S&P 1500 = S&P 500 + S&P 400 + S&P 600)
  const [sp500, nasdaq100raw, sp400raw, sp600raw] = await Promise.all([
    fetchSP500(),
    fetchNasdaq100(),
    fetchWikiStockList("List of S&P 400 companies", "S&P 400"),
    fetchWikiStockList("List of S&P 600 companies", "S&P 600"),
  ]);

  const normalize = (arr) =>
    arr.map((t) => (typeof t === "string" ? { ticker: t, name: t } : t));
  const nasdaq100 = normalize(nasdaq100raw);
  const sp400 = normalize(sp400raw);
  const sp600 = normalize(sp600raw);

  // 기존 핵심 종목 + 인기 ETF
  const extras = [
    { ticker: "GOOG",  name: "구글" },
    { ticker: "GOOGL", name: "구글 A" },
    { ticker: "AAPL",  name: "애플" },
    { ticker: "MSFT",  name: "마이크로소프트" },
    { ticker: "AMZN",  name: "아마존" },
    { ticker: "META",  name: "메타" },
    { ticker: "TSLA",  name: "테슬라" },
    { ticker: "NVDA",  name: "엔비디아" },
    { ticker: "LLY",   name: "일라이 릴리" },
    { ticker: "QQQ",   name: "QQQ ETF" },
    { ticker: "SPY",   name: "SPY ETF" },
    { ticker: "VOO",   name: "뱅가드 S&P500 ETF" },
    { ticker: "IWM",   name: "러셀2000 ETF" },
    { ticker: "VTI",   name: "뱅가드 전체시장 ETF" },
    { ticker: "DIA",   name: "다우존스 ETF" },
  ];

  // 중복 제거 후 합치기 (S&P 1500 구성)
  const allMap = new Map();
  for (const s of [...extras, ...sp500, ...nasdaq100, ...sp400, ...sp600]) {
    const ticker = s.ticker?.replace(/\./g, "-"); // BRK.B → BRK-B
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
    // 청크(100개)마다 길게 쉬기 (IP 차단 방어)
    const processed = downloaded + skipped + failed;
    if (processed > 0 && processed % 100 === 0) {
      const pause = Math.floor(Math.random() * 20000) + 20000; // 20~40초
      console.log(`\n⏸  100개 완료 — ${pause/1000}초 휴식 중...\n`);
      await sleep(pause);
    } else {
      await randomSleep(800, 2500);
    }

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

// ── S&P 400 Mid-Cap 하드코딩 폴백 ─────────────────────────────────────────────
const SP400_FALLBACK = [
  "ACI","AEO","AFG","AGCO","AIT","AJG","ALK","ALLE","ALV","AMCR",
  "AMKR","ANF","ARMK","ARW","ATR","AXS","BCPC","BDC","BFH","BJ",
  "BKH","BOH","BRC","BRKR","BRX","BWA","CABO","CADE","CASY","CBT",
  "CC","CCCS","CE","CFR","CHDN","CHE","CHH","CHRW","CHX","CMA",
  "CMC","CNA","CNH","CNO","COOP","CPT","CR","CRC","CROX","CRS",
  "CSL","CUBE","CW","CWT","CZR","DBD","DCI","DCO","DINO","DLB",
  "DNB","DPZ","DRH","DRQ","DTM","DY","EAT","EBC","EGP","ELAN",
  "ELS","EME","ENS","EPR","ESAB","ESE","ESNT","EWBC","EXP","EXPE",
  "FAF","FICO","FLO","FLR","FNB","FR","FUL","G","GFF","GGG",
  "GNTX","GPK","GXO","HAE","HAS","HBI","HBAN","HCC","HEI","HEIA",
  "HGV","HIW","HLI","HNI","HOG","HP","HPQ","HR","HRB","HRI",
  "HSC","HTH","HUN","IAA","IBP","IDCC","IDA","INGR","INW","ITT",
  "JHG","JJSF","JLL","JWN","KBH","KEX","KFY","KMT","KNF","KNX",
  "KRC","LANC","LBRT","LEA","LII","LKFN","LNC","LNTH","LPX","LRN",
  "LSTR","M","MAN","MASI","MBI","MBWM","MDGL","MDU","MHK","MKL",
  "MKSI","MLI","MMS","MMSI","MNR","MOH","MSA","MSM","MTG","MTZ",
  "MUR","NAVI","NBR","NEU","NFG","NJR","NNN","NOG","NOV","NRG",
  "NVT","NWE","NWSA","OC","OGE","OGS","OHI","OLN","OMCL","OMF",
  "ONB","OPCH","ORI","OSK","OUT","OXY","PACB","PARA","PB","PBF",
  "PCH","PII","PINC","PIPR","PLNT","PMTS","PNM","POL","POST","PPC",
  "PR","PSA","PVH","R","RBC","RGA","RHI","RIG","RLI","RMD",
  "ROIV","RPM","RPRX","RRX","RS","RUSHA","RYN","SAFE","SAIA","SCI",
  "SEE","SITE","SJM","SKX","SLM","SM","SMTC","SNX","SSD","STAG",
  "STE","STGW","STL","SUM","SUPN","SYBT","SXC","SXI","SXT","TDC",
  "TDS","TEX","TGI","THG","TKR","TMHC","TNL","TOL","TPX","TRN",
  "TRMK","TRU","TTC","TTEC","TUP","TWI","TXRH","UCB","UE","UGI",
  "UMBF","UNF","UNVR","UNM","URBN","VAL","VFC","VLY","VMI","VSH",
  "VVV","WBS","WCC","WEN","WEX","WHR","WMS","WOR","WPC","WRK",
  "WSFS","WTFC","WWE","WYNN","X","XPO","XRAY","XRX","YUM","ZWS",
].map((t) => ({ ticker: t, name: t }));

// ── S&P 600 Small-Cap 하드코딩 폴백 ──────────────────────────────────────────
const SP600_FALLBACK = [
  "ABG","ABM","ACA","ACLS","ACMR","AEL","AESI","AGL","AGIO","AGYS",
  "AHH","AHCO","AHPI","AIN","AKR","ALGT","ALKS","ALRM","ALX","AMBC",
  "AMCX","AMED","AMSF","AMWD","ANGI","AOSL","APAM","APOG","APTS","APY",
  "ARCB","ARCO","ARCT","ARDX","ARGO","ARI","AROW","ARTNA","ARVN","ASB",
  "ASGN","ASIX","ASTE","ATI","AUB","AVNS","AVNT","AWR","AX","AXGN",
  "AXNX","AZZ","B","BBSI","BCC","BCO","BCOV","BDN","BEAT","BECN",
  "BFC","BHLB","BIG","BJRI","BKD","BKE","BLMN","BMS","BMTC","BNL",
  "BOX","BRBR","BRG","BRKL","BSIG","BSM","BUG","BURL","BUSE","BWB",
  "BWIN","BXC","BXMT","CAC","CALM","CAR","CBB","CBRL","CBUS","CCK",
  "CCOI","CDLX","CENTA","CFB","CFFI","CFFN","CGNX","CHCO","CHCT","CHUY",
  "CIVB","CLBK","CLDT","CLFD","CLNE","CLW","CMO","CMPR","CNMD","CNOB",
  "CNSL","COF","COKE","COMM","CONN","CORT","COWI","CPRI","CPF","CPRX",
  "CRAI","CRD","CRDL","CRMT","CRVS","CSBR","CSGP","CSWI","CTBI","CTLT",
  "CVBF","CVET","CVU","CWT","DAKT","DBX","DCOM","DENN","DFH","DG",
  "DIOD","DJCO","DLPH","DMTK","DNOW","DNUT","DOOR","DPSI","DXPE","DY",
  "EARN","EAT","EBIX","ECPG","EDIT","EEFT","EFC","EFSC","EGBN","EGO",
  "EHTH","ELME","ELYM","EMBC","EME","EMKR","EMLD","ENOV","ENPC","ENSG",
  "ENTG","ENVB","ENVX","EPAC","EPAY","EPRT","ERA","ERII","ESCA","ESOA",
  "ESSA","ESTE","ETAC","ETSY","EVH","EVRI","EVTL","EXF","EXLS","EXPI",
  "FARO","FBIZ","FBK","FBP","FBSS","FCBT","FCFS","FCN","FCNCA","FCRD",
  "FEAM","FELE","FFBC","FFIN","FFNW","FGBI","FISI","FITB","FIVN","FLGT",
  "FLMN","FLY","FMBH","FMCB","FMNB","FNB","FNKO","FNF","FOCS","FOLD",
  "FORM","FORR","FORTY","FOSL","FOUR","FOXF","FRBA","FRME","FRPH","FRST",
  "FSB","FSBW","FSM","FSP","FSRV","FTDR","FTLF","FULT","FUL","FWAA",
  "FWP","GDEN","GERN","GFED","GGAL","GHC","GHLD","GIFI","GKOS","GLDD",
  "GNE","GNTY","GOE","GOOD","GPAK","GRFS","GRPN","GRTS","GS","GSIT",
  "GTY","HAFC","HAIN","HALO","HASI","HAYW","HBT","HCAT","HCI","HCM",
  "HDB","HDSN","HEES","HFC","HFFG","HGSH","HIBB","HIF","HIIQ","HIMS",
  "HLIT","HLNE","HLP","HLX","HMCL","HMST","HNCB","HNNA","HOOK","HOPE",
  "HOUS","HOVNP","HQY","HRMY","HRT","HSII","HSTM","HVT","HWBK","HWC",
  "HWKN","HYLN","HZNP","HZPT","IART","IBP","IBTX","ICAD","ICCC","ICF",
  "ICLR","ICPT","IDEX","IDN","IEC","IESC","IGT","IHRT","IIIN","IIVI",
  "ILPT","IMBI","IMCR","IMGN","IMKTA","IMMR","IMTX","INDB","INDV","INMD",
  "INSE","INSG","INT","IOSP","IPIX","IPSC","IRDM","IRMD","IRR","IRWD",
  "ISEE","ISPR","ISTR","ITGR","ITRI","ITRN","JACK","JELD","JKHY","JNCE",
  "JOBY","JOUT","JPM","JRVR","JXN","KAI","KAMN","KBAL","KBR","KELYA",
  "KFRC","KIDS","KN","KNSL","KOP","KOSS","KPLT","KRTX","KTOS","KW",
].map((t) => ({ ticker: t, name: t }));
