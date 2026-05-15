"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PERIOD_DAYS, type PeriodLabel } from "@/lib/types";

interface CalculatorFormProps {
  ticker: string;
}

const PERIOD_OPTIONS: PeriodLabel[] = ["매일", "매주", "매달", "매분기"];
const DURATION_OPTIONS = [1, 3, 6, 12, 24, 36, 60, 120];
type DurationUnit = "days" | "months" | "years";
const STORAGE_KEY = "stocksim-calc-settings";

interface SavedSettings {
  amount: string;
  period: PeriodLabel;
  duration: string;
  durationUnit: DurationUnit;
}

function loadSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSettings;
  } catch {
    return null;
  }
}

function saveSettings(s: SavedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function CalculatorForm({ ticker }: CalculatorFormProps) {
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<PeriodLabel>("매달");
  const [duration, setDuration] = useState<string>("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("months");
  const [errors, setErrors] = useState<{ amount?: string; duration?: string }>({});

  // 마운트 시 저장된 설정 복원
  useEffect(() => {
    const saved = loadSettings();
    if (!saved) return;
    if (saved.amount) setAmount(saved.amount);
    if (saved.period) setPeriod(saved.period);
    if (saved.duration) setDuration(saved.duration);
    if (saved.durationUnit) setDurationUnit(saved.durationUnit);
  }, []);
  const router = useRouter();

  function validate() {
    const errs: typeof errors = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errs.amount = "투자 금액을 입력해주세요";
    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0)
      errs.duration = "기간을 입력해주세요";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveSettings({ amount, period, duration, durationUnit });
    const params = new URLSearchParams({
      amount,
      period: String(PERIOD_DAYS[period]),
      durationValue: duration,
      durationUnit,
    });
    router.push(`/stock/${ticker}/result?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted text-sm">설정하기</p>

      <div className="grid grid-cols-3 gap-3">
        {/* Amount */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-ink font-medium text-center">금액</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
              }}
              placeholder="100,000"
              className={`w-full rounded-xl bg-elevated px-3 py-3 text-sm text-ink placeholder:text-faint outline-none text-center transition-all duration-150
                border ${errors.amount ? "border-red-500/60" : "border-transparent focus:border-ring"}
              `}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">{errors.amount}</p>
          )}
        </div>

        {/* Period */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-ink font-medium text-center">주기</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodLabel)}
            className="w-full rounded-xl bg-elevated px-3 py-3 text-sm text-ink outline-none cursor-pointer border border-transparent focus:border-ring transition-colors appearance-none text-center"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-ink font-medium text-center">기간</label>
          <div className="relative">
            <input
              type="number"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                if (errors.duration) setErrors((p) => ({ ...p, duration: undefined }));
              }}
              placeholder="12"
              min={1}
              className={`w-full rounded-xl bg-elevated px-3 py-3 text-sm text-ink placeholder:text-faint outline-none text-center transition-all duration-150
                border ${errors.duration ? "border-red-500/60" : "border-transparent focus:border-ring"}
              `}
            />
          </div>
          <select
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
            className="w-full rounded-xl bg-elevated px-3 py-2 text-xs text-ink outline-none cursor-pointer border border-transparent focus:border-ring transition-colors appearance-none text-center"
          >
            <option value="days">일</option>
            <option value="months">개월</option>
            <option value="years">년</option>
          </select>
          {errors.duration && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">{errors.duration}</p>
          )}
        </div>
      </div>

      {/* Quick duration chips */}
      <div className="flex gap-2 flex-wrap justify-center">
        {DURATION_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(String(d))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
              duration === String(d)
                ? "bg-ink text-page"
                : "bg-elevated text-muted hover:bg-muted-row"
            }`}
          >
            {durationUnit === "years"
              ? `${d}년`
              : durationUnit === "days"
                ? `${d}일`
                : d >= 12
                  ? `${d / 12}년`
                  : `${d}개월`}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-full bg-ring hover:bg-muted-row text-ink text-sm font-medium transition-colors duration-150 active:scale-95 border border-line"
        >
          결과 확인하기
        </button>
      </div>
    </div>
  );
}
