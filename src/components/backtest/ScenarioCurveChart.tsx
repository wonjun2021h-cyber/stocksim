"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ScenarioResult, TimeSeriesPoint } from "@/lib/portfolio-types";

interface ScenarioCurveChartProps {
  best: ScenarioResult;
  median: ScenarioResult;
  worst: ScenarioResult;
  totalInvested: number;
  /** 차트 높이 (기본 320) */
  height?: number;
  /** 공유 이미지용 — 설명 문구 숨김, 고정 너비 차트 */
  shareMode?: boolean;
  chartWidth?: number;
}

// ── 원화 포맷 유틸 ────────────────────────────────────────

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1_0000_0000) {
    return `${(n / 1_0000_0000).toFixed(1)}억`;
  }
  if (Math.abs(n) >= 10000) {
    return `${(n / 10000).toFixed(0)}만`;
  }
  return `${n.toLocaleString("ko-KR")}`;
}

function fmtDate(dateStr: string): string {
  // "YYYY-MM" → "YY.MM"
  if (!dateStr) return "";
  const [year, month] = dateStr.split("-");
  return `${year?.slice(2)}.${month}`;
}

// ── recharts 데이터 병합 ─────────────────────────────────

function mergeToChartData(
  best: TimeSeriesPoint[],
  median: TimeSeriesPoint[],
  worst: TimeSeriesPoint[]
): Array<{ date: string; best?: number; median?: number; worst?: number }> {
  // 가장 긴 배열 기준으로 인덱스 병합
  const maxLen = Math.max(best.length, median.length, worst.length);
  const result: Array<{
    date: string;
    best?: number;
    median?: number;
    worst?: number;
  }> = [];

  for (let i = 0; i < maxLen; i++) {
    result.push({
      date: (median[i] ?? best[i] ?? worst[i]).date,
      best: best[i]?.value,
      median: median[i]?.value,
      worst: worst[i]?.value,
    });
  }

  // X축 레이블: 너무 많으면 12개만 표시
  if (result.length > 60) {
    const step = Math.ceil(result.length / 12);
    return result.filter((_, i) => i === 0 || (i + 1) % step === 0 || i === result.length - 1);
  }

  return result;
}

// ── 커스텀 툴팁 ──────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-panel border border-line rounded-xl px-3 py-2.5 shadow-xl text-xs min-w-[140px]">
      <p className="font-semibold text-muted mb-2">{label}</p>
      {payload
        .filter((p) => p.value !== undefined)
        .sort((a, b) => b.value - a.value)
        .map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3 mb-1 last:mb-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-muted">{p.name}</span>
            </div>
            <span className="font-bold text-ink">{fmtKRW(p.value)}원</span>
          </div>
        ))}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export function ScenarioCurveChart({
  best,
  median,
  worst,
  totalInvested,
  height = 320,
  shareMode = false,
  chartWidth = 335,
}: ScenarioCurveChartProps) {
  if (
    best.curve.length === 0 &&
    median.curve.length === 0 &&
    worst.curve.length === 0
  ) {
    return (
      <div
        className="flex items-center justify-center text-muted text-sm"
        style={{ height }}
      >
        시뮬레이션 결과가 여기에 표시됩니다
      </div>
    );
  }

  const chartData = mergeToChartData(best.curve, median.curve, worst.curve);

  const chartInner = (
    <LineChart
      data={chartData}
      width={shareMode ? chartWidth : undefined}
      height={shareMode ? height : undefined}
      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
    >
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="var(--app-line)"
        strokeOpacity={0.5}
      />
      <XAxis
        dataKey="date"
        tick={{ fill: "var(--app-muted)", fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={fmtDate}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fill: "var(--app-muted)", fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v) => fmtKRW(v)}
        width={52}
      />
      {!shareMode && <Tooltip content={<CustomTooltip />} />}
      <Legend
        iconType="circle"
        iconSize={8}
        wrapperStyle={{ fontSize: "11px", color: "var(--app-muted)" }}
      />
      <ReferenceLine
        y={totalInvested}
        stroke="var(--app-line)"
        strokeDasharray="6 3"
        label={{
          value: `원금 ${fmtKRW(totalInvested)}`,
          fill: "var(--app-faint)",
          fontSize: 10,
          position: "insideTopLeft",
        }}
      />
      <Line
        type="monotone"
        dataKey="best"
        name="최고 수익"
        stroke="#FF4D4D"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
      />
      <Line
        type="monotone"
        dataKey="median"
        name="평균 수익"
        stroke="#4DA6FF"
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 4 }}
      />
      <Line
        type="monotone"
        dataKey="worst"
        name="최저 수익"
        stroke="#A0A0A0"
        strokeWidth={1.5}
        strokeDasharray="5 3"
        dot={false}
        activeDot={{ r: 4 }}
      />
    </LineChart>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 결과 카드 3개 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-bold text-ink px-0.5">결과</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "최고",
              scenario: best,
              dotColor: "#FF4D4D",
              textColor: "text-accent-up",
              gainColor: "text-accent-up",
            },
            {
              label: "평균",
              scenario: median,
              dotColor: "#4DA6FF",
              textColor: "text-ink",
              gainColor: "text-muted",
            },
            {
              label: "최저",
              scenario: worst,
              dotColor: "#A0A0A0",
              textColor: worst.gainPct < 0 ? "text-accent-down" : "text-ink",
              gainColor: worst.gainPct < 0 ? "text-accent-down" : "text-muted",
            },
          ].map(({ label, scenario, dotColor, textColor, gainColor }) => (
            <div
              key={label}
              className="bg-elevated rounded-2xl p-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="text-xs font-medium text-muted">{label}</span>
              </div>
              <p className={`text-base font-bold ${textColor} leading-tight`}>
                {fmtKRW(scenario.finalValue)}원
              </p>
              <p className={`text-xs ${gainColor}`}>
                {scenario.gainPct >= 0 ? "+" : ""}
                {scenario.gainPct.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {shareMode ? (
        chartInner
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chartInner}
        </ResponsiveContainer>
      )}

      {!shareMode && (
        <div className="grid grid-cols-1 gap-1.5 text-xs text-muted">
          <p>
            <span className="text-accent-up font-semibold">최고 수익</span>: 지난 12년 중 가장 좋은 시점에 투자를 시작했을 때
          </p>
          <p>
            <span className="text-accent-down font-semibold">평균 수익</span>: 모든 시작 시점의 중앙값 결과
          </p>
          <p>
            <span className="font-semibold">최저 수익</span>: 최고점에 진입하여 최대 낙폭(MDD)을 정면으로 맞았을 때
          </p>
        </div>
      )}
    </div>
  );
}
