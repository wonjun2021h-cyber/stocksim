/**
 * S&P 400 (중형주) + S&P 600 (소형주) 다운로더
 * S&P 500(기존) + 이 두 목록 = S&P 1500 종합지수
 * Usage: node scripts/add-sp400-sp600.mjs
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
const CHUNK   = 60;   // 이 개수마다 긴 휴식

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function randomUA() { return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]; }
function randomSleep(min, max) { return sleep(Math.floor(Math.random() * (max - min + 1)) + min); }

// ── Wikipedia HTML 파싱으로 종목 긁기 ──────────────────────────────────────
async function fetchWikiTickers(pageTitle, label) {
  console.log(`\n📋 ${label} Wikipedia 파싱 중...`);
  try {
    // REST API로 HTML 받기 (wikitext보다 파싱 쉬움)
    const url = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pageTitle)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // <td> 태그 안의 대문자 티커 패턴 추출 (1~5 대문자, 단독 셀)
    const tickers = new Set();
    const re = /<td[^>]*>([A-Z]{1,5})<\/td>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const t = m[1];
      // 흔한 HTML 단어 제외
      if (!["TD","TR","TH","BR","HR","LI","UL","OL","NA","NO","US","INC"].includes(t)) {
        tickers.add(t);
      }
    }
    // <a> 안 티커도 추가 (href="/wiki/NYSE:XXX" 패턴)
    const re2 = /NYSE:([A-Z]{1,5})|NASDAQ:([A-Z]{1,5})/g;
    while ((m = re2.exec(html)) !== null) tickers.add(m[1] || m[2]);

    if (tickers.size >= 50) {
      console.log(`  ✓ ${tickers.size}개 파싱 성공`);
      return [...tickers];
    }
    throw new Error(`파싱 결과 ${tickers.size}개 (너무 적음)`);
  } catch (e) {
    console.log(`  ⚠ Wikipedia 파싱 실패: ${e.message} → 하드코딩 폴백 사용`);
    return null;
  }
}

// ── Yahoo Finance 다운로드 (재시도 포함) ───────────────────────────────────
async function downloadHistory(ticker, attempt = 1) {
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
    if (!res.ok) {
      if (res.status === 429 && attempt <= 3) {
        await sleep(10000 * attempt);
        return downloadHistory(ticker, attempt + 1);
      }
      return null;
    }
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
    return points.length >= 100 ? points : null;
  } catch {
    if (attempt <= 2) { await sleep(5000 * attempt); return downloadHistory(ticker, attempt + 1); }
    return null;
  }
}

function isUptrending(history) {
  if (!history || history.length < 200) return false;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted[sorted.length-1].close <= sorted[0].close) return false;
  const yr = {};
  for (const p of sorted) {
    const y = p.date.slice(0,4);
    if (!yr[y]) yr[y] = { s: p.close, e: p.close };
    yr[y].e = p.close;
  }
  const vals = Object.values(yr);
  return vals.filter(v => v.e >= v.s).length >= Math.floor(vals.length * 0.65);
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(STOCKS_DIR, { recursive: true });
  const index = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH,"utf-8")) : [];
  const existingTickers = new Set(index.map(s => s.ticker));

  // Wikipedia에서 먼저 시도, 실패 시 하드코딩 폴백
  let sp400 = await fetchWikiTickers("List_of_S%26P_400_companies", "S&P 400");
  if (!sp400) sp400 = SP400;

  let sp600 = await fetchWikiTickers("List_of_S%26P_600_companies", "S&P 600");
  if (!sp600) sp600 = SP600;

  // 중복 제거 + 기존 보유 제외
  const all = [...new Set([...sp400, ...sp600])].map(t => t.replace(/\./g, "-"));
  const targets = all.filter(t => !existsSync(join(STOCKS_DIR, `${t}.json`)));

  console.log(`\n📊 S&P 400+600 합계: ${all.length}개`);
  console.log(`✅ 이미 보유: ${all.length - targets.length}개`);
  console.log(`⬇  신규 다운로드: ${targets.length}개\n`);

  let downloaded = 0, failed = 0;
  const failedList = [];

  for (let i = 0; i < targets.length; i++) {
    const ticker = targets[i];
    process.stdout.write(`\r[${String(i+1).padStart(4)}/${targets.length}] ${ticker.padEnd(7)} `);

    const history = await downloadHistory(ticker);

    // 청크 휴식 (IP 차단 방어)
    if ((i + 1) % CHUNK === 0 && i + 1 < targets.length) {
      const pause = 25000 + Math.floor(Math.random() * 15000); // 25~40초
      console.log(`\n\n⏸  ${CHUNK}개 완료 — ${(pause/1000).toFixed(0)}초 휴식...\n`);
      await sleep(pause);
    } else {
      await randomSleep(1200, 2800);
    }

    if (!history) {
      process.stdout.write(`❌\n`);
      failed++;
      failedList.push(ticker);
      continue;
    }

    const trending = isUptrending(history);
    writeFileSync(join(STOCKS_DIR, `${ticker}.json`), JSON.stringify({
      ticker, name: ticker, uptrending: trending,
      dataPoints: history.length,
      startDate: history[0].date, endDate: history[history.length-1].date,
      startPrice: history[0].close, endPrice: history[history.length-1].close,
      history,
    }));
    process.stdout.write(`✅ ${history.length}일\n`);
    downloaded++;

    if (!existingTickers.has(ticker)) {
      index.push({ ticker, name: ticker, uptrending: trending, dataPoints: history.length, startDate: history[0].date, endDate: history[history.length-1].date });
      existingTickers.add(ticker);
    }
    if ((downloaded + failed) % 30 === 0) writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  }

  // 실패 목록 1회 재시도 (더 긴 딜레이)
  if (failedList.length > 0) {
    console.log(`\n\n🔁 실패 종목 재시도: ${failedList.length}개 (30초 대기 후)\n`);
    await sleep(30000);
    const retryFail = [];
    for (const ticker of failedList) {
      process.stdout.write(`  [재시도] ${ticker.padEnd(7)} `);
      const history = await downloadHistory(ticker);
      await randomSleep(2000, 4000);
      if (!history) { process.stdout.write(`❌\n`); retryFail.push(ticker); continue; }
      const trending = isUptrending(history);
      writeFileSync(join(STOCKS_DIR, `${ticker}.json`), JSON.stringify({
        ticker, name: ticker, uptrending: trending,
        dataPoints: history.length,
        startDate: history[0].date, endDate: history[history.length-1].date,
        startPrice: history[0].close, endPrice: history[history.length-1].close,
        history,
      }));
      process.stdout.write(`✅ ${history.length}일\n`);
      downloaded++;
      if (!existingTickers.has(ticker)) {
        index.push({ ticker, name: ticker, uptrending: trending, dataPoints: history.length, startDate: history[0].date, endDate: history[history.length-1].date });
        existingTickers.add(ticker);
      }
    }
    if (retryFail.length > 0) console.log(`\n  최종 실패: ${retryFail.join(", ")}`);
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\n\n✅ 완료! 총 인덱스: ${index.length}개`);
  console.log(`   다운로드 성공: ${downloaded}개 / 최종 실패: ${failedList.length}개`);
}

main().catch(console.error);

// ════════════════════════════════════════════════════════════════
// S&P 400 Mid-Cap 전체 목록 (하드코딩 폴백)
// ════════════════════════════════════════════════════════════════
const SP400 = [
  "ACI","AEO","AGCO","AIT","ALLE","AMG","AMKR","ANF","ARW","ASH",
  "ATR","AXS","BRKR","BRX","BWA","CABO","CADE","CBT","CE","CFR",
  "CHDN","CHE","CHH","CMA","CMC","CNA","CNH","CNO","COOP","CPT",
  "CR","CROX","CRS","CSL","CUBE","CW","DCI","DCO","DINO","DLB",
  "DNB","DPZ","DRH","DTM","DY","EAT","EBC","EGP","ELAN","ELS",
  "EME","ENS","EPR","ESAB","ESE","ESNT","EWBC","EXP","FAF","FICO",
  "FLO","FLR","FNB","FR","FUL","G","GFF","GGG","GNTX","GPK",
  "GXO","HAE","HAS","HBI","HCC","HEI","HGV","HIW","HLI","HNI",
  "HOG","HP","HRB","HRI","HSC","HUN","IBP","IDCC","IDA","INGR",
  "ITT","JHG","JJSF","JLL","JWN","KBH","KEX","KFY","KMT","KNX",
  "KRC","LANC","LBRT","LEA","LII","LNC","LNTH","LPX","LRN","LSTR",
  "M","MAN","MASI","MDU","MHK","MKL","MKSI","MLI","MMS","MMSI",
  "MOH","MSA","MSM","MTG","MTZ","MUR","NAVI","NBR","NEU","NFG",
  "NJR","NNN","NOG","NOV","NRG","NVT","NWE","OC","OGE","OGS",
  "OHI","OLN","OMCL","OMF","ONB","ORI","OSK","PB","PBF","PCH",
  "PII","PIPR","PLNT","PNM","POST","PPC","PR","PVH","R","RBC",
  "RGA","RHI","RLI","RMD","RPM","RPRX","RRX","RS","RYN","SAIA",
  "SCI","SEE","SITE","SJM","SKX","SLM","SM","SNX","SSD","STAG",
  "STE","STL","SUM","SXT","TDC","TDS","TEX","THG","TKR","TMHC",
  "TNL","TOL","TPX","TRN","TRMK","TRU","TTC","TWI","TXRH","UCB",
  "UE","UGI","UMBF","UNF","UNVR","UNM","URBN","VAL","VFC","VLY",
  "VMI","VSH","VVV","WBS","WCC","WEN","WEX","WHR","WMS","WOR",
  "WPC","WRK","WSFS","WTFC","WWE","X","XPO","XRAY","YUM","ZWS",
  "ACM","ACHC","ADNT","AFG","AGL","AIZ","ARCB","ARMK","AUB","AWR",
  "AX","AZZ","BBSI","BCC","BCO","BDN","BECN","BFC","BHLB","BIG",
  "BJRI","BKD","BKE","BLMN","BMS","BMTC","BNL","BOX","BRG","BRKL",
  "BSIG","BWB","BXC","CAC","CALM","CAR","CBRL","CC","CDK","CIR",
  "CIVB","CLDT","CLFD","CLW","CMO","CONN","CORT","CPF","CPRX",
  "CRAI","CRD","CRMT","CRVS","CSBR","CTBI","CVBF","CVET","CVU",
  "DAKT","DBX","DCOM","DENN","DFH","DIOD","DJCO","DLPH","DMTK",
  "DNOW","DNUT","DOOR","DPSI","DXPE","EARN","EBIX","ECPG","EDIT",
  "EEFT","EFC","EFSC","EGBN","EGO","EHTH","ELME","EMBC","EME","EMKR",
  "ENOV","ENSG","ENTG","ERA","ERII","ESCA","ESOA","ESSA","ETSY",
  "EVH","EVRI","EXLS","EXPI","FARO","FBIZ","FBK","FBP","FCFS","FCN",
  "FELE","FFBC","FFIN","FISI","FIVN","FLGT","FORM","FORR","FOSL",
  "FOUR","FOXF","FRME","FRST","FSB","FSBW","FULT","GDEN","GERN",
  "GHC","GHLD","GIFI","GKOS","GLDD","GNE","GNTY","GOOD","GRFS",
  "GRPN","GTY","HAFC","HAIN","HALO","HASI","HAYW","HBT","HCAT",
  "HCI","HDSN","HEES","HIBB","HLIT","HLNE","HLX","HMST","HOOK",
  "HOPE","HOUS","HQY","HRMY","HSII","HSTM","HVT","HWBK","HWC",
].map(t => t.trim());

// ════════════════════════════════════════════════════════════════
// S&P 600 Small-Cap 전체 목록 (하드코딩 폴백)
// ════════════════════════════════════════════════════════════════
const SP600 = [
  "ABG","ABM","ACLS","ACMR","AEL","AESI","AGL","AGIO","AGYS","AHH",
  "AIN","AKR","ALGT","ALKS","ALRM","ALX","AMBC","AMCX","AMED","AMSF",
  "AMWD","ANGI","AOSL","APAM","APOG","APY","ARCB","ARCO","ARCT","ARDX",
  "ARGO","ARI","AROW","ARTNA","ARVN","ASB","ASGN","ASIX","ASTE","ATI",
  "AVNS","AVNT","AWR","AX","AXGN","AXNX","AZZ","BCPC","BDC","BFC",
  "BHLB","BIG","BJRI","BKD","BKE","BLMN","BMS","BMTC","BNL","BOX",
  "BRBR","BRG","BRKL","BSIG","BSM","BURL","BUSE","BWB","BWIN","BXC",
  "CAC","CALM","CAR","CBB","CBRL","CBUS","CCK","CCOI","CDLX","CENTA",
  "CFB","CFFI","CFFN","CGNX","CHCO","CHCT","CHUY","CIVB","CLBK","CLDT",
  "CLFD","CLNE","CLW","CMO","CMPR","CNMD","CNOB","CNSL","COF","COKE",
  "COMM","CONN","CORT","COWI","CPRI","CPF","CPRX","CRAI","CRD","CRDL",
  "CRMT","CRVS","CSBR","CSGP","CSWI","CTBI","CTLT","CVBF","CVET","CVU",
  "CWT","DAKT","DBX","DCOM","DENN","DFH","DG","DIOD","DJCO","DLPH",
  "DMTK","DNOW","DNUT","DOOR","DPSI","DXPE","EARN","EBIX","ECPG","EDIT",
  "EEFT","EFC","EFSC","EGBN","EGO","EHTH","ELME","ELYM","EMBC","EMKR",
  "EMLD","ENOV","ENPC","ENSG","ENTG","ENVB","ENVX","EPAC","EPAY","EPRT",
  "ERA","ERII","ESCA","ESOA","ESSA","ESTE","ETAC","ETSY","EVH","EVRI",
  "EVTL","EXF","EXLS","EXPI","FARO","FBIZ","FBK","FBP","FBSS","FCBT",
  "FCFS","FCN","FCNCA","FCRD","FEAM","FELE","FFBC","FFIN","FFNW","FGBI",
  "FISI","FITB","FIVN","FLGT","FLMN","FLY","FMBH","FMCB","FMNB","FNB",
  "FNKO","FNF","FOCS","FOLD","FORM","FORR","FORTY","FOSL","FOUR","FOXF",
  "FRBA","FRME","FRPH","FRST","FSB","FSBW","FSM","FSP","FSRV","FTDR",
  "FULT","FUL","GDEN","GERN","GFED","GGAL","GHC","GHLD","GIFI","GKOS",
  "GLDD","GNE","GNTY","GOE","GOOD","GPAK","GRFS","GRPN","GRTS","GSIT",
  "GTY","HAFC","HAIN","HALO","HASI","HAYW","HBT","HCAT","HCI","HCM",
  "HDB","HDSN","HEES","HFC","HFFG","HGSH","HIBB","HIF","HIIQ","HIMS",
  "HLIT","HLNE","HLP","HLX","HMCL","HMST","HNCB","HNNA","HOOK","HOPE",
  "HOUS","HOVNP","HQY","HRMY","HRT","HSII","HSTM","HVT","HWBK","HWC",
  "HWKN","IART","IBP","IBTX","ICAD","ICCC","ICF","ICLR","ICPT","IDEX",
  "IDN","IEC","IESC","IGT","IHRT","IIIN","IIVI","ILPT","IMBI","IMCR",
  "IMGN","IMKTA","IMMR","IMTX","INDB","INDV","INMD","INSE","INSG","INT",
  "IOSP","IPIX","IPSC","IRDM","IRMD","IRR","IRWD","ISEE","ISPR","ISTR",
  "ITGR","ITRI","ITRN","JACK","JELD","JKHY","JNCE","JOBY","JOUT","JRVR",
  "JXN","KAI","KAMN","KBAL","KBR","KELYA","KFRC","KIDS","KN","KNSL",
  "KOP","KOSS","KPLT","KRTX","KTOS","KW","LADR","LAKE","LANC","LBAI",
  "LBRT","LCII","LCNB","LDOS","LFUS","LGND","LGF-A","LGF-B","LILAK",
  "LINC","LKFN","LMAT","LMNR","LNDC","LNTH","LOOP","LOVE","LPX","LQDT",
  "LSCC","LTRPA","LWAY","LYTS","MAC","MATX","MBIN","MBUU","MCBC","MDRX",
  "MGLN","MGPI","MGRC","MIII","MIME","MIRM","MKTX","MLKN","MMI","MMSI",
  "MNRO","MNSB","MODG","MOG-A","MORN","MPB","MPLN","MPWR","MRCY","MRTN",
  "MSGE","MSGS","MSTR","MTX","MVBF","NBTB","NBTF","NCBS","NFBK","NGS",
  "NKLA","NLOK","NMRK","NNTB","NOA","NOMD","NRDS","NRIM","NRXS","NSP",
  "NTCT","NTGR","NTRA","NTUS","NUS","NVAX","NVEE","NWBI","NWL","NWN",
  "NWPX","NYCB","NYMX","NYNY","NYRE","OBK","OCFC","OCSL","OFG","OFIX",
  "OFLX","OGN","OOMA","OPBK","OPCH","OPES","ORCL","ORGO","ORLY","ORMP",
  "OSBC","OSIS","OSPN","OTTR","OUT","OVLY","OXLC","OXM","PAGS","PAHC",
  "PAYO","PBI","PBPB","PCRX","PDCO","PDFS","PEBO","PFBC","PFIS","PFMT",
  "PGNY","PHR","PLAB","PLAY","PLPC","PLXS","PMTS","PNTM","POWI","PPBI",
  "PPBT","PRDO","PRFT","PRGO","PRGS","PRIM","PRLD","PROS","PRX","PRZE",
  "PSMT","PTCT","PTGX","PTVE","PW","PWSC","PYCR","PYXS","QDEL","QNST",
  "QTRX","RBBN","RBNC","RCKT","RCUS","RDNT","REZI","RFIL","RICK","RKLY",
  "RLGT","RLMD","RLX","RMBL","RMNI","ROAD","ROCH","ROCR","ROCK","ROIC",
  "ROLL","RPHM","RPID","RPRX","RSKD","RSSS","RTLX","RULE","RUSHA","RYAN",
  "RYAM","SAFE","SAFT","SAMA","SAMG","SBCF","SBGI","SBSI","SCHI","SCHW",
  "SCKT","SCOR","SCRM","SDGR","SEDG","SEER","SEMR","SENS","SFBS","SFNC",
  "SHEN","SHIP","SHOO","SHYF","SIBN","SIGI","SILK","SIMO","SITM","SKYW",
  "SLCA","SLNG","SLQT","SMBC","SMBK","SMIT","SMLR","SMPL","SMTC","SNV",
  "SOFI","SONO","SONN","SOTK","SPOK","SPR","SPSC","SPWH","SQSP","SRC",
  "SRCE","SRDX","SREV","SRPT","SSBK","SSBI","STC","STEP","STKL","STR",
  "STRS","SUPN","SVB","SWBI","SYBT","SYKE","SXC","SXI","TAHOE","TCBI",
  "TBNK","TCBK","TCMD","TCRR","TCVA","TDS","TDVG","TELL","TFSL","TGTX",
  "TH","THFF","THRY","TILE","TIPT","TISI","TKC","TLRY","TMDX","TMHC",
  "TNXP","TPIC","TPST","TPTX","TRCA","TRHC","TRMD","TRMK","TRNS","TRUP",
  "TRVI","TSC","TSVT","TUP","TWO","TXMD","TYME","TYRA","UAVS","UBCP",
  "UBFO","UBOH","UBSI","UCBI","UCTT","UEIC","UHS","ULCC","ULH","UMBF",
  "UMPQ","UNTY","UPLD","UPW","USAK","USAP","USAS","USIO","USPH","UXIN",
  "VBTX","VCNX","VCYT","VEC","VG","VGFC","VGIT","VIRC","VIVO","VLRS",
  "VMEO","VNCE","VOXX","VRAR","VRDN","VREX","VRTX","VSCO","VSEC","VSTM",
  "VTOL","VVOS","WGO","WLFC","WLTW","WNEB","WRLD","WSBC","WSFS","WTBA",
  "WTRE","WTTR","WWW","XNCR","XOMA","XPEL","XPER","XTLB","XXII","YELP",
  "YEXT","YMAB","ZEUS","ZION","ZIXI","ZLAB","ZMTP","ZNTL","ZUMZ","ZUO",
].map(t => t.trim());
