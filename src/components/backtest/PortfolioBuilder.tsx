"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PortfolioItem } from "@/lib/portfolio-types";
import { PORTFOLIO_COLORS } from "@/lib/portfolio-simulation";
import { fmtKRW } from "@/lib/formatKrw";

export type DcaPeriod = "day" | "month" | "year";
export type DurationUnit = "days" | "months" | "years";

interface PortfolioBuilderProps {
  stocks: Array<{ ticker: string; name: string }>;
  stocksLoading?: boolean;
  /** 비중 계산된 종목 리스트 + 총 투자금액을 부모에 전달 */
  onChange: (items: PortfolioItem[], totalAmount: number) => void;
  /** 추가 적립금 금액 (controlled) */
  dcaAmount: string;
  onDcaAmountChange: (v: string) => void;
  /** 추가 적립금 주기 (controlled) */
  dcaPeriod: DcaPeriod;
  onDcaPeriodChange: (v: DcaPeriod) => void;
  /** 투자 기간 값 (controlled) */
  durationValue: string;
  onDurationValueChange: (v: string) => void;
  /** 투자 기간 단위 (controlled) */
  durationUnit: DurationUnit;
  onDurationUnitChange: (v: DurationUnit) => void;
}

const MAX_ITEMS = 10;
const MAX_SEARCH_RESULTS = 50;

function searchStocks(
  stocks: Array<{ ticker: string; name: string }>,
  query: string
): Array<{ ticker: string; name: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: Array<{ stock: { ticker: string; name: string }; score: number }> = [];

  for (const stock of stocks) {
    const ticker = stock.ticker.toLowerCase();
    const name = stock.name.toLowerCase();
    let score = 0;

    if (ticker === q) score = 100;
    else if (ticker.startsWith(q)) score = 80;
    else if (name.startsWith(q)) score = 60;
    else if (ticker.includes(q)) score = 40;
    else if (name.includes(q)) score = 20;
    else continue;

    scored.push({ stock, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.stock.ticker.localeCompare(b.stock.ticker)
    )
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ stock }) => stock);
}

const DCA_PERIOD_LABELS: Record<DcaPeriod, string> = {
  day: "일",
  month: "월",
  year: "년",
};

const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  days: "일",
  months: "개월",
  years: "년",
};

const DURATION_PRESETS: Record<DurationUnit, number[]> = {
  years:  [1, 3, 5, 10, 15, 20],
  months: [6, 12, 24, 36, 60, 120],
  days:   [30, 90, 180, 365, 730],
};

function parseAmt(s: string): number {
  return Math.max(0, Number(s.replace(/,/g, "")) || 0);
}

interface InternalItem {
  ticker: string;
  name: string;
  /** 비중 계산용 금액 (실제 투자금이 아닌 비율 설정용) */
  amount: string;
}

export function PortfolioBuilder({
  stocks,
  stocksLoading = false,
  onChange,
  dcaAmount,
  onDcaAmountChange,
  dcaPeriod,
  onDcaPeriodChange,
  durationValue,
  onDurationValueChange,
  durationUnit,
  onDurationUnitChange,
}: PortfolioBuilderProps) {
  const [items, setItems] = useState<InternalItem[]>([
    { ticker: "", name: "", amount: "" },
  ]);
  const [search, setSearch] = useState<string[]>([""]);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 총 입력 금액 (비중 계산 기준)
  const totalAmount = items.reduce((s, it) => s + parseAmt(it.amount), 0);

  // ── 비중 계산 후 부모에 전달 ─────────────────────────
  // onChange를 ref로 유지해 매 렌더마다 useEffect가 재실행되는 무한루프 방지
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const notifyParent = useCallback((nextItems: InternalItem[]) => {
    const total = nextItems.reduce((s, it) => s + parseAmt(it.amount), 0);
    const portfolioItems: PortfolioItem[] = nextItems
      .filter((it) => it.ticker && parseAmt(it.amount) > 0)
      .map((it) => ({
        ticker: it.ticker,
        name: it.name,
        weight:
          total > 0
            ? Math.round((parseAmt(it.amount) / total) * 10000) / 100
            : 0,
      }));
    onChangeRef.current(portfolioItems, total);
  }, []); // onChange는 ref로 참조하므로 의존성 없음

  useEffect(() => {
    notifyParent(items);
  }, [items, notifyParent]);

  // ── 종목 업데이트 ─────────────────────────────────────

  const updateItem = useCallback((idx: number, patch: Partial<InternalItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }, []);

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    setItems((prev) => [...prev, { ticker: "", name: "", amount: "" }]);
    setSearch((prev) => [...prev, ""]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setSearch((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── 균등 배분 ─────────────────────────────────────────

  const equalizeAmounts = () => {
    const total = totalAmount;
    if (total <= 0 || items.length === 0) return;
    const base = Math.floor(total / items.length);
    const last = total - base * (items.length - 1);
    setItems((prev) =>
      prev.map((it, i) => ({
        ...it,
        amount: String(i === items.length - 1 ? last : base),
      }))
    );
  };

  const getSearchResults = (query: string) => searchStocks(stocks, query);

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. 추가 적립금 + 투자 기간 ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 추가 적립금 + 주기 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">
            추가 적립금{" "}
            <span className="font-normal text-faint">(선택)</span>
          </label>
          <div className="flex rounded-xl bg-elevated overflow-hidden">
            <input
              type="number"
              value={dcaAmount}
              onChange={(e) => onDcaAmountChange(e.target.value)}
              placeholder="300000"
              className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm text-ink placeholder:text-faint outline-none"
            />
            <div className="flex border-l border-line shrink-0">
              {(["day", "month", "year"] as DcaPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onDcaPeriodChange(p)}
                  className={`px-3 py-3 text-sm font-semibold transition-colors ${
                    dcaPeriod === p
                      ? "bg-ink text-panel"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {DCA_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          {dcaAmount && parseAmt(dcaAmount) > 0 && (
            <p className="text-xs text-muted">
              {fmtKRW(parseAmt(dcaAmount))} / {DCA_PERIOD_LABELS[dcaPeriod]}
            </p>
          )}
        </div>

        {/* 투자 기간 + 단위 (인라인) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">투자 기간</label>
          <div className="flex rounded-xl bg-elevated overflow-hidden">
            <input
              type="number"
              value={durationValue}
              onChange={(e) => onDurationValueChange(e.target.value)}
              min={1}
              placeholder="10"
              className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm text-ink placeholder:text-faint outline-none"
            />
            <div className="flex border-l border-line shrink-0">
              {(["years", "months", "days"] as DurationUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onDurationUnitChange(u)}
                  className={`px-3 py-3 text-sm font-semibold transition-colors ${
                    durationUnit === u
                      ? "bg-ink text-panel"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {DURATION_UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>

          {/* 프리셋 칩 */}
          <div className="flex gap-1.5 flex-wrap">
            {DURATION_PRESETS[durationUnit].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onDurationValueChange(String(v))}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  durationValue === String(v)
                    ? "bg-ink text-panel"
                    : "bg-elevated text-muted hover:bg-ring"
                }`}
              >
                {v}{DURATION_UNIT_LABELS[durationUnit]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. 종목 리스트 ────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-muted">
              종목 선택{" "}
              <span className="text-faint font-normal">(최대 {MAX_ITEMS}개)</span>
            </label>
            <p className="text-[11px] text-faint mt-0.5">
              금액을 입력하면 비중(%)이 자동 계산됩니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalAmount > 0 && (
              <span className="text-xs font-bold text-ink">
                합계 {fmtKRW(totalAmount)}
              </span>
            )}
            <button
              type="button"
              onClick={equalizeAmounts}
              className="text-xs text-muted hover:text-ink underline underline-offset-2 transition-colors"
            >
              균등 배분
            </button>
          </div>
        </div>

        {errors.items && (
          <p className="text-xs text-danger-text">{errors.items}</p>
        )}

        {/* 컬럼 레이블 */}
        <div className="flex gap-2 px-1 pb-0.5">
          <span className="w-2.5 shrink-0" />
          <span className="flex-1 text-[10px] text-faint font-medium">종목</span>
          <span className="w-28 text-[10px] text-faint font-medium text-center shrink-0">
            금액 (비중 계산용)
          </span>
          <span className="w-4 shrink-0" />
        </div>

        {items.map((item, idx) => {
          const amt = parseAmt(item.amount);
          const weight =
            totalAmount > 0 && amt > 0
              ? Math.round((amt / totalAmount) * 1000) / 10
              : 0;
          const searchResults = getSearchResults(search[idx]);

          return (
            <div key={idx} className="flex items-start gap-2 relative">
              {/* 컬러 도트 */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-3.5"
                style={{
                  backgroundColor: item.ticker
                    ? PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length]
                    : "var(--app-line)",
                }}
              />

              {/* 종목 검색 */}
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={search[idx]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearch((prev) =>
                      prev.map((s, i) => (i === idx ? val : s))
                    );
                    setDropdownOpen(idx);
                    if (!val) updateItem(idx, { ticker: "", name: "" });
                  }}
                  onFocus={() => setDropdownOpen(idx)}
                  onBlur={() => setTimeout(() => setDropdownOpen(null), 150)}
                  placeholder="티커 / 종목명"
                  className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm text-ink placeholder:text-faint outline-none border border-transparent focus:border-ring transition-colors"
                />
                {item.ticker && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <span className="text-xs font-bold text-muted bg-muted-row rounded px-1.5 py-0.5">
                      {item.ticker}
                    </span>
                  </div>
                )}

                {/* 자동완성 드롭다운 */}
                {dropdownOpen === idx && (
                  <ul className="absolute z-40 top-full mt-1 left-0 right-0 bg-panel border border-line rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {stocksLoading ? (
                      <li className="px-3 py-3 text-xs text-muted text-center">
                        종목 데이터 로딩 중...
                      </li>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((s) => (
                        <li
                          key={s.ticker}
                          onMouseDown={() => {
                            updateItem(idx, { ticker: s.ticker, name: s.name });
                            setSearch((prev) =>
                              prev.map((sr, i) => (i === idx ? s.ticker : sr))
                            );
                            setDropdownOpen(null);
                          }}
                          className="flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer hover:bg-elevated transition-colors"
                        >
                          <span className="font-semibold text-ink">{s.ticker}</span>
                          <span className="text-xs text-muted truncate ml-2 max-w-[140px]">
                            {s.name}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-3 text-xs text-muted text-center">
                        {search[idx].trim()
                          ? "검색 결과가 없습니다"
                          : "티커나 종목명을 입력하세요"}
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* 금액 입력 + 비중 표시 */}
              <div className="w-28 shrink-0 flex flex-col gap-1.5">
                <div className="rounded-xl bg-elevated overflow-hidden">
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateItem(idx, { amount: e.target.value })}
                    placeholder=""
                    min={0}
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-ink text-right outline-none"
                  />
                </div>
                {amt > 0 && (
                  <p className="text-xs text-muted text-right">
                    {fmtKRW(amt)}
                  </p>
                )}
                {weight > 0 && (
                  <p className="text-[10px] text-muted text-right font-semibold">
                    {weight.toFixed(1)}%
                  </p>
                )}
              </div>

              {/* 삭제 */}
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-faint hover:text-danger-text transition-colors shrink-0 mt-3"
                  aria-label="종목 삭제"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
            </div>
          );
        })}

        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors self-start mt-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            종목 추가
          </button>
        )}
      </div>
    </div>
  );
}
