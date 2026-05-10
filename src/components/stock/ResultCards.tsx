"use client";

import { useRef } from "react";
import { formatKRW } from "@/lib/stockCalculations";
import type { SimulationResult } from "@/lib/simulation-logic";

interface ResultCardsProps {
  result: SimulationResult;
  totalInvestedKRW: number;
  durationYears: number;
  /** 회당 납입금 (원) — DCA 연금 공식에 사용 */
  periodicPayment: number;
  /** 납입 주기 (일, 예: 매일=1, 매주=7, 매달=30) */
  paymentIntervalDays: number;
  /** 종목 티커 — 콘솔 로그 식별용 */
  ticker?: string;
}

// ---------------------------------------------------------------------------
// 투자 기간별 동적 CAGR 캡
// ---------------------------------------------------------------------------
function getDynamicCagrCap(investmentYears: number): number {
  if (investmentYears >= 21) return 0.12; // 21년 이상: 12%
  if (investmentYears >= 10) return 0.20; // 10-21년: 20%
  if (investmentYears >= 5)  return 0.25; // 5-10년: 25%
  return 0.30;                            // 5년 미만: 30%
}

// ---------------------------------------------------------------------------
// 평균회귀 보정
// 10년 이후부터 시장 평균(10%)으로 선형 수렴, 30년에 완전 수렴
// ---------------------------------------------------------------------------
const MARKET_AVG_CAGR     = 0.10;
const REVERSION_START_YEAR = 10;
const REVERSION_FULL_YEAR  = 30;

function withMeanReversion(cagr: number, investmentYears: number): number {
  if (investmentYears <= REVERSION_START_YEAR || cagr <= MARKET_AVG_CAGR) {
    return cagr;
  }
  let cumulative = Math.pow(1 + cagr, REVERSION_START_YEAR);
  for (let y = REVERSION_START_YEAR + 1; y <= investmentYears; y++) {
    const blend = Math.min(
      1,
      (y - REVERSION_START_YEAR) / (REVERSION_FULL_YEAR - REVERSION_START_YEAR)
    );
    const yearRate = cagr * (1 - blend) + MARKET_AVG_CAGR * blend;
    cumulative *= (1 + yearRate);
  }
  return Math.pow(cumulative, 1 / investmentYears) - 1;
}

// ---------------------------------------------------------------------------
// Worst 하한선 (투자 기간별)
// ---------------------------------------------------------------------------
function getWorstFloorMultiplier(durationYears: number): number {
  if (durationYears >= 15) return 1.10;
  if (durationYears >= 10) return 0.95;
  if (durationYears >= 5)  return 0.80;
  return 0.60;
}

// ---------------------------------------------------------------------------
// DCA 미래가치 — 연금 공식 (ordinary annuity)
//
// FV = PMT × ((1+R)^T - 1) / ((1+R)^(T/n) - 1)
//   PMT: 회당 납입금
//   R:   연간 수익률 (decimal)
//   T:   총 기간(년)
//   n:   총 납입 횟수
//
// 각 납입금은 잔여 기간만큼만 복리 적용 — 일시납(lump-sum) 오류 수정
// ---------------------------------------------------------------------------
function dcaFinalValue(
  periodicPayment: number,
  totalPayments: number,
  annualRate: number,
  totalYears: number
): number {
  if (totalPayments <= 0) return 0;
  if (Math.abs(annualRate) < 0.001) return periodicPayment * totalPayments;

  const totalGrowth  = Math.pow(1 + annualRate, totalYears);
  const periodGrowth = Math.pow(1 + annualRate, totalYears / totalPayments);

  if (Math.abs(periodGrowth - 1) < 1e-10) return periodicPayment * totalPayments;

  return periodicPayment * (totalGrowth - 1) / (periodGrowth - 1);
}

const SANITY_MULTIPLIER  = 20;
const HIGH_RETURN_WARN_PCT = 1000;

export function ResultCards({
  result,
  totalInvestedKRW,
  durationYears,
  periodicPayment,
  paymentIntervalDays,
  ticker = "unknown",
}: ResultCardsProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const years         = Math.max(durationYears, 1 / 12);
  const totalPayments = Math.max(1, Math.round(years * 365 / Math.max(1, paymentIntervalDays)));

  // ── 1. 동적 CAGR 캡 (투자 기간별)
  //   best/base: 낙관 시나리오 → 기간별 동적 캡 적용
  //   worst:     비관 시나리오 → 시장 평균(10%) 이하로 제한
  //              (NVDA 같은 고성장주도 최악의 경우는 시장 평균 수준으로 가정)
  const dynamicCap   = getDynamicCagrCap(years);
  const cappedBest   = Math.min(result.best,  dynamicCap);
  const cappedBase   = Math.min(result.base,  dynamicCap);
  const cappedWorst  = Math.min(result.worst, MARKET_AVG_CAGR); // worst ≤ 시장 평균
  const dynamicCapped = cappedBest < result.best || cappedBase < result.base || cappedWorst < result.worst;

  if (dynamicCapped) {
    console.log(
      `[DYNAMIC_CAP] ${ticker} ${years.toFixed(0)}년 투자` +
      ` | best cap=${(dynamicCap * 100).toFixed(0)}% worst cap=${(MARKET_AVG_CAGR * 100).toFixed(0)}%` +
      ` | best: ${(result.best * 100).toFixed(1)}% → ${(cappedBest * 100).toFixed(1)}%` +
      ` | base: ${(result.base * 100).toFixed(1)}% → ${(cappedBase * 100).toFixed(1)}%` +
      ` | worst: ${(result.worst * 100).toFixed(1)}% → ${(cappedWorst * 100).toFixed(1)}%`
    );
  }

  // ── 2. 평균회귀 보정
  //   best/base: 시장 평균으로 수렴
  //   worst:     cappedWorst ≤ 10% 이면 withMeanReversion 변화 없음(조건 분기 통과)
  const effectiveBest  = withMeanReversion(cappedBest,  years);
  const effectiveBase  = withMeanReversion(cappedBase,  years);
  const effectiveWorst = withMeanReversion(cappedWorst, years);

  const meanReverted =
    years > REVERSION_START_YEAR &&
    (effectiveBest < cappedBest || effectiveBase < cappedBase || effectiveWorst < cappedWorst);

  if (meanReverted) {
    console.log(
      `[MEAN_REVERSION] ${ticker} ${years.toFixed(0)}년 투자` +
      ` | best: ${(cappedBest * 100).toFixed(1)}% → ${(effectiveBest * 100).toFixed(1)}%` +
      ` | base: ${(cappedBase * 100).toFixed(1)}% → ${(effectiveBase * 100).toFixed(1)}%`
    );
  }

  // ── 3. DCA 연금 공식으로 최종 자산 계산 (lump-sum 오류 수정)
  const rawBestFinalKRW  = Math.round(dcaFinalValue(periodicPayment, totalPayments, effectiveBest,  years));
  const rawWorstFinalKRW = Math.round(dcaFinalValue(periodicPayment, totalPayments, effectiveWorst, years));

  // ── 4. Worst 하한선 클램핑
  const floorMultiplier = result.dataInsufficient ? null : getWorstFloorMultiplier(durationYears);
  const floorKRW        = floorMultiplier !== null ? Math.round(totalInvestedKRW * floorMultiplier) : null;
  const worstFinalKRW   = floorKRW !== null ? Math.max(rawWorstFinalKRW, floorKRW) : rawWorstFinalKRW;
  const bestFinalKRW    = rawBestFinalKRW;

  // ── 5. 수익률 계산
  const maxGainKRW = bestFinalKRW  - totalInvestedKRW;
  const minGainKRW = worstFinalKRW - totalInvestedKRW;
  const maxGainPct = (maxGainKRW / totalInvestedKRW) * 100;
  const minGainPct = (minGainKRW / totalInvestedKRW) * 100;

  // ── 6. 1000% 초과 경고
  if (maxGainPct > HIGH_RETURN_WARN_PCT) {
    console.warn(
      `[HIGH_RETURN] ${ticker} ${years.toFixed(0)}년 투자 | 최대 수익률 ${maxGainPct.toFixed(0)}% 초과` +
      ` | effectiveBest CAGR=${(effectiveBest * 100).toFixed(1)}%` +
      ` | totalPayments=${totalPayments}`
    );
  }

  // ── 7. Sanity check (20배 초과)
  const needsDataReview = bestFinalKRW > totalInvestedKRW * SANITY_MULTIPLIER;
  if (needsDataReview) {
    console.warn(
      `[SANITY] ${ticker}: 최대 수익 원금 대비 ${(bestFinalKRW / totalInvestedKRW).toFixed(1)}배 — 데이터 검토 필요`
    );
  }

  // ── 8. 요청된 3종목 상세 콘솔 출력
  const DEBUG_TICKERS = ["TSLA", "NVDA", "LLY"];
  if (DEBUG_TICKERS.includes(ticker.toUpperCase())) {
    console.group(`📊 [SIM_DEBUG] ${ticker} ${years.toFixed(0)}년 DCA 시뮬레이션`);
    console.log(`납입: ${formatKRW(periodicPayment)}원 × ${totalPayments}회 (${paymentIntervalDays}일 주기)`);
    console.log(`총 납입 원금: ${formatKRW(totalInvestedKRW)}원`);
    console.log(`동적 CAGR 캡: ${(dynamicCap * 100).toFixed(0)}% | 원본 best: ${(result.best * 100).toFixed(1)}%`);
    console.log(`보정 후 CAGR: best=${(effectiveBest * 100).toFixed(1)}% base=${(effectiveBase * 100).toFixed(1)}% worst=${(effectiveWorst * 100).toFixed(1)}%`);
    console.log(`최종 자산: best=${formatKRW(bestFinalKRW)}원 worst=${formatKRW(worstFinalKRW)}원`);
    console.log(`수익률: best=+${maxGainPct.toFixed(1)}% worst=${minGainPct.toFixed(1)}%`);
    console.groupEnd();
  }

  const investedDisplay = formatKRW(totalInvestedKRW);
  const maxIsLoss = maxGainKRW < 0;
  const minIsLoss = minGainKRW < 0;
  const correctionApplied = result.cagrCapped || dynamicCapped || meanReverted;

  return (
    <div ref={cardRef} className="space-y-3">
      {/* 수익률 보정 배지 */}
      {correctionApplied && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-[#1e3a2a] border border-emerald-300/70 dark:border-[#4caf7d]/40 px-4 py-2.5">
          <span className="text-emerald-700 dark:text-[#4caf7d] text-base">📊</span>
          <p className="text-emerald-800 dark:text-[#4caf7d] text-xs font-medium">
            수익률 보정 적용됨
            {result.cagrCapped && " · 데이터 30% 캡"}
            {dynamicCapped && ` · ${years.toFixed(0)}년 기간 캡(${(dynamicCap * 100).toFixed(0)}%)`}
            {meanReverted && " · 장기 평균회귀"}
          </p>
        </div>
      )}

      {/* 데이터 검토 경고 */}
      {needsDataReview && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-[#4a3a1a] border border-amber-300/70 dark:border-[#f6c453]/40 px-4 py-2.5">
          <span className="text-amber-700 dark:text-[#f6c453] text-base">⚠️</span>
          <p className="text-amber-900 dark:text-[#f6c453] text-xs font-medium">
            데이터 검토 필요 — 최대 수익이 비정상적으로 높습니다
          </p>
        </div>
      )}

      {/* 장기 데이터 없음 경고 */}
      {result.dataInsufficient && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-bg border border-danger-border px-4 py-2.5">
          <span className="text-danger-text text-base">⚠️</span>
          <p className="text-danger-text text-xs font-medium">
            장기 데이터 없음 — 하한선 보정이 적용되지 않습니다
          </p>
        </div>
      )}

      <p className="text-muted text-sm">
        원금 <span className="text-ink font-semibold">{investedDisplay}원</span>으로
        {result.rollingWindowYears > 0 && (
          <span className="text-subtle text-xs ml-1">
            ({result.rollingWindowYears.toFixed(0)}년 데이터 기준)
          </span>
        )}
      </p>

      {/* Max gain card */}
      <div
        className="group rounded-2xl bg-elevated p-5 cursor-default border border-line/80 dark:border-transparent
          transition-all duration-200 ease-out
          hover:scale-[1.04] hover:shadow-lg dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <p className="text-muted text-sm mb-2">최대 수익</p>
        <p className={`text-2xl font-bold ${maxIsLoss ? "text-accent-down" : "text-accent-up"}`}>
          {maxGainKRW >= 0 ? "+" : ""}
          {formatKRW(maxGainKRW)}원 ({maxGainPct >= 0 ? "+" : ""}
          {maxGainPct.toFixed(1)}%)
        </p>
        <p className="text-muted text-sm mt-1">
          {formatKRW(bestFinalKRW)} 원 예상
        </p>
      </div>

      {/* Min gain card */}
      <div
        className="group rounded-2xl bg-elevated p-5 cursor-default border border-line/80 dark:border-transparent
          transition-all duration-200 ease-out
          hover:scale-[1.04] hover:shadow-lg dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <p className="text-muted text-sm mb-2">최소 수익</p>
        <p className={`text-2xl font-bold ${minIsLoss ? "text-accent-down" : "text-accent-up"}`}>
          {minGainKRW >= 0 ? "+" : ""}
          {formatKRW(minGainKRW)}원 ({minGainPct >= 0 ? "+" : ""}
          {minGainPct.toFixed(1)}%)
        </p>
        <p className="text-muted text-sm mt-1">
          {formatKRW(worstFinalKRW)} 원 예상
          {floorKRW !== null && worstFinalKRW > rawWorstFinalKRW && (
            <span className="text-subtle text-xs ml-1">(하한선 적용됨)</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share / save placeholder (wire up html2canvas + clipboard later)
// ---------------------------------------------------------------------------
export function ShareActions({ ticker }: { ticker: string }) {
  function handleSaveImage() {
    alert("이미지 저장 기능 준비 중입니다");
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("링크가 복사되었습니다!");
    });
  }

  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={handleSaveImage}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-elevated hover:bg-muted-row text-muted hover:text-ink text-xs transition-colors duration-150 border border-line/70 dark:border-transparent"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        이미지 저장
      </button>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-elevated hover:bg-muted-row text-muted hover:text-ink text-xs transition-colors duration-150 border border-line/70 dark:border-transparent"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        링크 복사
      </button>
    </div>
  );
}
