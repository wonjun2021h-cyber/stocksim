"use client";

import { useRef } from "react";
import { formatKRW } from "@/lib/stockCalculations";
import { computeProjection } from "@/lib/resultProjection";
import type { SimulationResult } from "@/lib/simulation-logic";

interface ResultCardsProps {
  result: SimulationResult;
  totalInvestedKRW: number;
  durationYears: number;
  /** 실제 납입 횟수 (결과 페이지와 동일하게 계산) */
  totalPayments: number;
  /** 회당 납입금 (원) — DCA 연금 공식에 사용 */
  periodicPayment: number;
  /** 납입 주기 (일, 예: 매일=1, 매주=7, 매달=30) — 표시용 */
  paymentIntervalDays: number;
  /** 종목 티커 — 콘솔 로그 식별용 */
  ticker?: string;
}

const HIGH_RETURN_WARN_PCT = 1000;

export function ResultCards({
  result,
  totalInvestedKRW,
  durationYears,
  totalPayments,
  periodicPayment,
  paymentIntervalDays,
  ticker = "unknown",
}: ResultCardsProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    bestFinalKRW,
    worstFinalKRW,
    maxGainKRW,
    minGainKRW,
    maxGainPct,
    minGainPct,
    needsDataReview,
    correctionApplied,
  } = computeProjection({
    result,
    totalInvestedKRW,
    durationYears,
    totalPayments,
    periodicPayment,
    ticker,
  });

  if (maxGainPct > HIGH_RETURN_WARN_PCT) {
    console.warn(`[HIGH_RETURN] ${ticker} | 최대 수익률 ${maxGainPct.toFixed(0)}%`);
  }

  const investedDisplay = formatKRW(totalInvestedKRW);
  const maxIsLoss = maxGainKRW < 0;
  const minIsLoss = minGainKRW < 0;

  return (
    <div ref={cardRef} className="space-y-3">
      {correctionApplied && (
        <div
          data-no-share
          className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-[#1e3a2a] border border-emerald-300/70 dark:border-[#4caf7d]/40 px-4 py-2.5"
        >
          <span className="text-emerald-700 dark:text-[#4caf7d] text-base">📊</span>
          <p className="text-emerald-800 dark:text-[#4caf7d] text-xs font-medium">
            수익률 보정 적용됨
            {result.cagrCapped && " · 데이터 30% 캡"}
            {correctionApplied && " · 기간·데이터 보정"}
          </p>
        </div>
      )}

      {needsDataReview && (
        <div
          data-no-share
          className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-[#4a3a1a] border border-amber-300/70 dark:border-[#f6c453]/40 px-4 py-2.5"
        >
          <span className="text-amber-700 dark:text-[#f6c453] text-base">⚠️</span>
          <p className="text-amber-900 dark:text-[#f6c453] text-xs font-medium">
            데이터 검토 필요 — 최대 수익이 비정상적으로 높습니다
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

      <div
        className="group rounded-2xl bg-elevated p-5 cursor-default border border-line/80 dark:border-transparent
          transition-all duration-200 ease-out
          hover:scale-[1.08] hover:shadow-lg dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <p className="text-muted text-sm mb-2">최대 수익</p>
        <p className={`text-2xl font-bold ${maxIsLoss ? "text-accent-down" : "text-accent-up"}`}>
          {maxGainKRW >= 0 ? "+" : ""}
          {formatKRW(maxGainKRW)}원 ({maxGainPct >= 0 ? "+" : ""}
          {maxGainPct.toFixed(1)}%)
        </p>
        <p className="text-muted text-sm mt-1">{formatKRW(bestFinalKRW)} 원 예상</p>
      </div>

      <div
        className="group rounded-2xl bg-elevated p-5 cursor-default border border-line/80 dark:border-transparent
          transition-all duration-200 ease-out
          hover:scale-[1.08] hover:shadow-lg dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <p className="text-muted text-sm mb-2">최소 수익</p>
        <p className={`text-2xl font-bold ${minIsLoss ? "text-accent-down" : "text-accent-up"}`}>
          {minGainKRW >= 0 ? "+" : ""}
          {formatKRW(minGainKRW)}원 ({minGainPct >= 0 ? "+" : ""}
          {minGainPct.toFixed(1)}%)
        </p>
        <p className="text-muted text-sm mt-1">
          {formatKRW(worstFinalKRW)} 원 예상
        </p>
      </div>

      {/* 면책 문구 */}
      <p
        data-no-share
        className="text-xs text-subtle leading-relaxed pt-1"
      >
        ⚠ 이 결과는 과거 종가 기준 참고용 시뮬레이션이며 투자 조언이 아닙니다.
        배당·분할은 반영되지 않았으며, 과거 수익이 미래를 보장하지 않습니다.
      </p>
    </div>
  );
}
