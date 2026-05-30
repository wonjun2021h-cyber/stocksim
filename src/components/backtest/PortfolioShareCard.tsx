"use client";

import type { BacktestResponse } from "@/lib/portfolio-types";
import { ScenarioCurveChart } from "@/components/backtest/ScenarioCurveChart";

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1_0000_0000)
    return `${(n / 1_0000_0000).toFixed(1)}억원`;
  if (Math.abs(n) >= 10000)
    return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 결과 공유용 — 투자 시뮬레이션 + 결과 + 차트만 담은 카드 */
export function PortfolioShareCard({ result }: { result: BacktestResponse }) {
  const { meta, scenarios } = result;

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl bg-panel p-5 border border-line dark:border-transparent w-[375px] overflow-visible"
      style={{ lineHeight: 1.4 }}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-ink">투자 시뮬레이션</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "초기 원금", value: fmtKRW(meta.initialInvestment) },
            {
              label: "월 적립금",
              value: meta.monthlyDCA > 0 ? fmtKRW(meta.monthlyDCA) : "없음",
            },
            { label: "총 투자금", value: fmtKRW(meta.totalInvested) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-elevated rounded-xl px-2 py-3.5 min-h-[68px] flex flex-col items-center justify-center text-center overflow-visible"
              style={{ lineHeight: 1.4 }}
            >
              <p className="text-[11px] text-muted leading-[1.35]">{label}</p>
              <p className="text-xs font-bold text-ink leading-[1.35] mt-1.5">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ScenarioCurveChart
        best={scenarios.best}
        median={scenarios.median}
        worst={scenarios.worst}
        totalInvested={meta.totalInvested}
        height={280}
        shareMode
        chartWidth={335}
      />
    </div>
  );
}
