"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PortfolioBuilder, type DcaPeriod, type DurationUnit } from "@/components/backtest/PortfolioBuilder";
import { PortfolioResultDashboard } from "@/components/backtest/PortfolioResultDashboard";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { savePortfolio } from "@/lib/supabase";
import { fetchAllStocks } from "@/lib/csvParser";
import type { PortfolioItem, BacktestResponse } from "@/lib/portfolio-types";
import type { StockInfo } from "@/lib/types";

type PageState = "input" | "loading" | "result" | "error";

const STORAGE_KEY = "stocksim-backtest-v2";

interface SavedSettings {
  dcaAmount: string;
  dcaPeriod: DcaPeriod;
  durationValue: string;
  durationUnit: DurationUnit;
  items: PortfolioItem[];
}

function loadSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSettings) : null;
  } catch {
    return null;
  }
}

function saveSettings(s: SavedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** 추가 적립금을 월 단위로 환산 */
function toMonthlyDCA(amount: string, period: DcaPeriod): number {
  const amt = Number(amount) || 0;
  if (period === "day") return Math.round(amt * 30);
  if (period === "year") return Math.round(amt / 12);
  return amt;
}

/** 투자 기간을 년 단위로 환산 */
function toDurationYears(value: string, unit: DurationUnit): number {
  const v = Number(value) || 1;
  if (unit === "days") return Math.max(0.1, v / 365);
  if (unit === "months") return Math.max(0.1, v / 12);
  return Math.max(0.1, v);
}

export default function BacktestPage() {
  const { user } = useAuth();

  // ── 폼 상태 ──────────────────────────────────────────
  const [dcaAmount, setDcaAmount] = useState("");
  const [dcaPeriod, setDcaPeriod] = useState<DcaPeriod>("month");
  const [durationValue, setDurationValue] = useState("10");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("years");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [totalInvestedAmount, setTotalInvestedAmount] = useState(0);

  // ── 종목 목록 ────────────────────────────────────────
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);

  // ── UI 상태 ──────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("input");
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── 초기 로드 ────────────────────────────────────────
  useEffect(() => {
    setStocksLoading(true);
    fetchAllStocks()
      .then(setStocks)
      .finally(() => setStocksLoading(false));

    const saved = loadSettings();
    if (!saved) return;
    if (saved.dcaAmount) setDcaAmount(saved.dcaAmount);
    if (saved.dcaPeriod) setDcaPeriod(saved.dcaPeriod);
    if (saved.durationValue) setDurationValue(saved.durationValue);
    if (saved.durationUnit) setDurationUnit(saved.durationUnit);
    if (saved.items?.length) setItems(saved.items);
  }, []);

  // ── 시뮬레이션 실행 ───────────────────────────────────
  async function handleSimulate() {
    const initAmt = totalInvestedAmount;

    if (items.length === 0 || initAmt <= 0) {
      setErrorMessage("최소 1개 종목과 금액을 입력해주세요.");
      setPageState("error");
      return;
    }
    const durationYearsNum = toDurationYears(durationValue, durationUnit);
    if (!durationValue || durationYearsNum < 0.08) {
      setErrorMessage("투자 기간을 입력해주세요 (최소 1개월).");
      setPageState("error");
      return;
    }

    saveSettings({ dcaAmount, dcaPeriod, durationValue, durationUnit, items });
    setPageState("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialInvestment: initAmt,
          monthlyDCA: toMonthlyDCA(dcaAmount, dcaPeriod),
          durationYears: durationYearsNum,
          items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "API 오류가 발생했습니다.");
      }

      const data: BacktestResponse = await res.json();
      setResult(data);
      setPageState("result");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
      setPageState("error");
    }
  }

  // ── 포트폴리오 저장 ───────────────────────────────────
  async function handleSave() {
    if (!user) {
      setShowAuth(true); // 비로그인 → 로그인 팝업
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await savePortfolio(
        user.id,
        `포트폴리오 ${new Date().toLocaleDateString("ko-KR")}`,
        totalInvestedAmount,
        toMonthlyDCA(dcaAmount, dcaPeriod),
        items
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[SAVE_PORTFOLIO]", err);
    } finally {
      setIsSaving(false);
    }
  }

  // ── 렌더링 ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-page">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between pr-4 md:pr-6">
        <Navbar />
      </header>

      {/* 저장 성공 토스트 */}
      {saveSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-panel text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl">
          포트폴리오가 저장되었습니다 ✓
        </div>
      )}

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="포트폴리오를 저장하려면 로그인이 필요합니다."
        onSuccess={() => setShowAuth(false)}
      />

      {/* 메인 콘텐츠 */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">포트폴리오 만들기</h1>
          <p className="text-sm text-muted">
            최대 10개 종목 · 520개 미국 주식 · 12년 데이터 기반 시뮬레이션
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-panel rounded-2xl border border-line dark:border-transparent p-5">
          <PortfolioBuilder
            stocks={stocks}
            stocksLoading={stocksLoading}
            onChange={(newItems, total) => {
              setItems(newItems);
              setTotalInvestedAmount(total);
            }}
            dcaAmount={dcaAmount}
            onDcaAmountChange={setDcaAmount}
            dcaPeriod={dcaPeriod}
            onDcaPeriodChange={setDcaPeriod}
            durationValue={durationValue}
            onDurationValueChange={setDurationValue}
            durationUnit={durationUnit}
            onDurationUnitChange={setDurationUnit}
          />

          {/* 시뮬레이션 버튼 */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={pageState === "loading"}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-ink text-panel text-sm font-bold hover:opacity-80 transition-opacity disabled:opacity-60 active:scale-[0.98]"
            >
              {pageState === "loading" ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-panel/30 border-t-panel animate-spin" />
                  시뮬레이션 중...
                </>
              ) : (
                <>
                  시뮬레이션 시작
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 에러 */}
        {pageState === "error" && (
          <div className="rounded-2xl bg-danger-bg border border-danger-border px-4 py-3">
            <p className="text-sm text-danger-text font-medium">⚠ {errorMessage}</p>
            <button
              className="text-xs text-danger-text underline mt-1"
              onClick={() => setPageState("input")}
            >
              다시 입력하기
            </button>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {pageState === "loading" && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-72 rounded-2xl bg-panel border border-line" />
            <div className="h-48 rounded-2xl bg-panel border border-line" />
          </div>
        )}

        {/* 결과 대시보드 */}
        {pageState === "result" && result && (
          <PortfolioResultDashboard
            result={result}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}
