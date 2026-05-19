"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PORTFOLIO_COLORS } from "@/lib/portfolio-simulation";

interface AllocationItem {
  ticker: string;
  name: string;
  weight: number;
  value: number;
}

interface AllocationDonutChartProps {
  allocation: AllocationItem[];
  /** 도넛 중앙에 표시할 텍스트 (예: "내 포트폴리오") */
  centerLabel?: string;
}

// recharts 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AllocationItem }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-panel border border-line rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-ink">{item.ticker}</p>
      <p className="text-muted">{item.name}</p>
      <p className="font-semibold text-ink mt-1">{item.weight.toFixed(2)}%</p>
    </div>
  );
}

export function AllocationDonutChart({
  allocation,
  centerLabel = "포트폴리오",
}: AllocationDonutChartProps) {
  if (!allocation || allocation.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        종목을 추가하면 비중 차트가 표시됩니다
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 도넛 차트 */}
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocation}
              dataKey="value"
              nameKey="ticker"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={allocation.length > 1 ? 3 : 0}
              strokeWidth={0}
            >
              {allocation.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* 도넛 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted">{centerLabel}</p>
          <p className="text-sm font-bold text-ink">{allocation.length}개 종목</p>
        </div>
      </div>

      {/* 종목 상세 리스트 ────────────────────────────────────
          UI 레이아웃: 도넛 차트 하단 영역
          - 컬러 도트 + 티커 + 종목명 + 비중(%)
       */}
      <ul className="flex flex-col gap-2">
        {allocation.map((item, idx) => (
          <li
            key={item.ticker}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            {/* 좌: 색상 + 이름 */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length],
                }}
              />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-ink">
                  {item.ticker}
                </span>
                <span className="text-xs text-muted ml-1.5 truncate">
                  {item.name}
                </span>
              </div>
            </div>

            {/* 우: 비중 */}
            <span className="text-sm font-bold text-ink shrink-0">
              {item.weight.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
