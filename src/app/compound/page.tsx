"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { SearchBar } from "@/components/layout/SearchBar";

export default function CompoundPage() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<number | null>(null);

  function calculate() {
    const p = Number(principal);
    const r = Number(rate) / 100;
    const n = Number(years);
    if (!p || !r || !n) return;
    setResult(Math.round(p * Math.pow(1 + r, n)));
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar>
          <SearchBar stocks={[]} variant="navbar" />
        </HeaderToolbar>
      </header>

      <main className="max-w-md mx-auto px-6 py-12 space-y-6">
        <h1 className="text-xl font-bold text-ink">복리 계산기</h1>

        <div className="rounded-2xl bg-panel p-6 space-y-5 border border-line dark:border-transparent">
          {[
            { label: "원금 (원)", value: principal, set: setPrincipal, placeholder: "10,000,000" },
            { label: "연 수익률 (%)", value: rate, set: setRate, placeholder: "10" },
            { label: "투자 기간 (년)", value: years, set: setYears, placeholder: "10" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm text-muted">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl bg-elevated px-4 py-3 text-ink text-sm placeholder:text-faint outline-none border border-transparent focus:border-ring"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={calculate}
            className="w-full py-3 rounded-xl bg-ring hover:bg-muted-row text-ink text-sm font-medium transition-colors border border-line"
          >
            계산하기
          </button>

          {result !== null && (
            <div className="rounded-xl bg-elevated p-4 text-center border border-line/80 dark:border-transparent">
              <p className="text-muted text-sm mb-1">최종 금액</p>
              <p className="text-2xl font-bold text-ink">
                {result.toLocaleString("ko-KR")}원
              </p>
              <p className="text-accent-up text-sm mt-1">
                수익 {(result - Number(principal)).toLocaleString("ko-KR")}원 (
                {(((result - Number(principal)) / Number(principal)) * 100).toFixed(1)}%)
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
