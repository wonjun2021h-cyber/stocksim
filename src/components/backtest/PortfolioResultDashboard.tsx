"use client";

import { useState, useId } from "react";
import type { BacktestResponse } from "@/lib/portfolio-types";
import { AllocationDonutChart } from "@/components/backtest/AllocationDonutChart";
import { ScenarioCurveChart } from "@/components/backtest/ScenarioCurveChart";
import { PortfolioShareCard } from "@/components/backtest/PortfolioShareCard";
import { buildPortfolioShareUrl, copyText } from "@/lib/portfolio-share";
import { saveElementAsImage } from "@/lib/save-as-image";

interface PortfolioResultDashboardProps {
  result: BacktestResponse;
  onSave: () => void;
  isSaving: boolean;
  hideSaveButton?: boolean;
  /** 마이페이지 인라인 등 좁은 컨테이너에서 사용 시 */
  compact?: boolean;
}

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1_0000_0000)
    return `${(n / 1_0000_0000).toFixed(1)}억원`;
  if (Math.abs(n) >= 10000)
    return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString("ko-KR")}원`;
}

/**
 * 토스 증권 스타일 백테스팅 결과 대시보드
 *
 * ┌─────────────────────────┬─────────────────────────────────────────┐
 * │  [좌] 도넛 차트          │  [우] 투자 정보 + 시나리오 라인 차트    │
 * │  + 종목 리스트           │                                         │
 * └─────────────────────────┴─────────────────────────────────────────┘
 */
export function PortfolioResultDashboard({
  result,
  onSave,
  isSaving,
  hideSaveButton = false,
  compact = false,
}: PortfolioResultDashboardProps) {
  const { meta, allocation, scenarios, portfolioMetrics, warnings } = result;
  const captureId = `portfolio-share-${useId().replace(/:/g, "")}`;
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);

  function showFeedback(
    setter: (msg: string | null) => void,
    message: string
  ) {
    setter(message);
    window.setTimeout(() => setter(null), 2500);
  }

  async function handleCopyLink() {
    try {
      const url = buildPortfolioShareUrl(result);
      await copyText(url);
      showFeedback(setLinkFeedback, "링크 복사됨 ✓");
    } catch {
      showFeedback(setLinkFeedback, "복사 실패 — 다시 시도해 주세요");
    }
  }

  async function handleSaveImage() {
    if (sharePending) return;
    setSharePending(true);
    setShareFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 200));
      const tickers = allocation.map((a) => a.ticker).join("-");
      await saveElementAsImage(captureId, `stocksim-portfolio-${tickers}.png`);
      showFeedback(setShareFeedback, "이미지 저장됨 ✓");
    } catch {
      showFeedback(setShareFeedback, "저장 실패 — 다시 시도해 주세요");
    } finally {
      setSharePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── 경고 배너 ────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-[#4a3a1a] border border-amber-300/70 dark:border-[#f6c453]/40 px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-amber-800 dark:text-[#f6c453]">
            📊 데이터 안내
          </p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-[#f6c453]/80">
              · {w.message}
            </p>
          ))}
        </div>
      )}

      {/* ── 메인 2-컬럼 레이아웃 ─────────────────────── */}
      <div className={`grid grid-cols-1 gap-5 ${compact ? "" : "md:grid-cols-2"}`}>
        {/* ─ 좌측: 자산 비중 도넛 + 종목 리스트 ──────── */}
        <div className="bg-panel rounded-2xl border border-line dark:border-transparent p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink">자산 비중</h3>
          <AllocationDonutChart allocation={allocation} />
        </div>

        {/* ─ 우측: 투자 정보 + 차트 ──────────────────── */}
        <div className="bg-panel rounded-2xl border border-line dark:border-transparent p-5 flex flex-col gap-5">
          {/* 투자 정보 요약 */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-ink">투자 시뮬레이션</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-elevated rounded-xl py-2.5 px-2">
                <p className="text-xs text-muted truncate">초기 원금</p>
                <p className="text-xs font-bold text-ink mt-0.5 truncate">
                  {fmtKRW(meta.initialInvestment)}
                </p>
              </div>
              <div className="bg-elevated rounded-xl py-2.5 px-2">
                <p className="text-xs text-muted truncate">월 적립금</p>
                <p className="text-xs font-bold text-ink mt-0.5 truncate">
                  {meta.monthlyDCA > 0 ? fmtKRW(meta.monthlyDCA) : "없음"}
                </p>
              </div>
              <div className="bg-elevated rounded-xl py-2.5 px-2">
                <p className="text-xs text-muted truncate">총 투자금</p>
                <p className="text-xs font-bold text-ink mt-0.5 truncate">
                  {fmtKRW(meta.totalInvested)}
                </p>
              </div>
            </div>
          </div>

          {/* 시나리오 비교 차트 */}
          <ScenarioCurveChart
            best={scenarios.best}
            median={scenarios.median}
            worst={scenarios.worst}
            totalInvested={meta.totalInvested}
            height={260}
          />
        </div>
      </div>

      {/* ── 포트폴리오 지표 ───────────────────────────── */}
      <div className="bg-panel rounded-2xl border border-line dark:border-transparent p-5">
        <h3 className="text-sm font-bold text-ink mb-3">포트폴리오 지표</h3>
        <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {[
            {
              label: "최대 낙폭 (MDD)",
              value: `-${portfolioMetrics.mdd.toFixed(1)}%`,
              sub: "중앙값 기준",
              color: "text-accent-down",
            },
            {
              label: "최대 회복 기간",
              value: `${portfolioMetrics.recoveryMonths}개월`,
              sub: "고점 대비",
              color: "text-ink",
            },
            {
              label: "연평균 수익률 (최고)",
              value: `+${portfolioMetrics.annualizedReturn.best.toFixed(1)}%`,
              sub: "CAGR",
              color: "text-accent-up",
            },
            {
              label: "연평균 수익률 (최저)",
              value: `${portfolioMetrics.annualizedReturn.worst >= 0 ? "+" : ""}${portfolioMetrics.annualizedReturn.worst.toFixed(1)}%`,
              sub: "CAGR",
              color:
                portfolioMetrics.annualizedReturn.worst >= 0
                  ? "text-accent-up"
                  : "text-accent-down",
            },
          ].map((m) => (
            <div key={m.label} className="bg-elevated rounded-xl p-3">
              <p className="text-xs text-muted leading-tight">{m.label}</p>
              <p className={`text-lg font-bold ${m.color} mt-1`}>{m.value}</p>
              <p className="text-xs text-subtle mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-subtle leading-relaxed text-center">
        ⚠ 이 결과는 과거 종가 데이터 기반 참고용 시뮬레이션이며 투자 조언이 아닙니다.
        배당·주식분할은 반영되지 않았으며, 과거 수익이 미래 수익을 보장하지 않습니다.
      </p>

      {/* 공유 이미지용 (화면 밖 렌더) */}
      <div
        id={captureId}
        aria-hidden
        className="pointer-events-none fixed top-0 w-[375px]"
        style={{ left: "-9999px" }}
      >
        <PortfolioShareCard result={result} />
      </div>

      {/* ── 저장 버튼 + 공유 ────────────────────── */}
      <div className="flex flex-col gap-3">
        {!hideSaveButton && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="w-full py-3.5 rounded-2xl bg-ink text-panel text-sm font-bold hover:opacity-80 transition-opacity disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-panel/30 border-t-panel animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 14l4-4 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                포트폴리오 저장하기
              </>
            )}
          </button>
        )}

        {/* 공유 버튼 */}
        <div className="flex items-center gap-2 justify-center">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-elevated border border-line dark:border-transparent text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {linkFeedback ?? "링크 복사"}
          </button>

          <button
            type="button"
            onClick={handleSaveImage}
            disabled={sharePending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink text-panel text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {sharePending ? "저장 중..." : shareFeedback ?? "결과 공유"}
          </button>
        </div>
      </div>
    </div>
  );
}
