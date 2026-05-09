"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
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
    <div className="min-h-screen bg-[#2a2a2a]">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <SearchBar stocks={[]} variant="navbar" />
      </header>

      <main className="max-w-md mx-auto px-6 py-12 space-y-6">
        <h1 className="text-xl font-bold text-white">복리 계산기</h1>

        <div className="rounded-2xl bg-[#333333] p-6 space-y-5">
          {[
            { label: "원금 (원)", value: principal, set: setPrincipal, placeholder: "10,000,000" },
            { label: "연 수익률 (%)", value: rate, set: setRate, placeholder: "10" },
            { label: "투자 기간 (년)", value: years, set: setYears, placeholder: "10" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-sm text-[#aaa]">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl bg-[#3d3d3d] px-4 py-3 text-white text-sm placeholder-[#555] outline-none border border-transparent focus:border-[#555]"
              />
            </div>
          ))}

          <button
            onClick={calculate}
            className="w-full py-3 rounded-xl bg-[#555] hover:bg-[#666] text-white text-sm font-medium transition-colors"
          >
            계산하기
          </button>

          {result !== null && (
            <div className="rounded-xl bg-[#3d3d3d] p-4 text-center">
              <p className="text-[#aaa] text-sm mb-1">최종 금액</p>
              <p className="text-2xl font-bold text-white">
                {result.toLocaleString("ko-KR")}원
              </p>
              <p className="text-[#ff4d4d] text-sm mt-1">
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
