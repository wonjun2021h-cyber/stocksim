"use client";

import { useState } from "react";
import { submitStockRequest, formatFeedbackError } from "@/lib/feedback";

export function StockRequestForm() {
  const [ticker, setTicker] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) {
      setErrorMsg("티커를 입력해 주세요.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      await submitStockRequest({
        ticker: ticker,
        message: message || undefined,
      });
      setTicker("");
      setMessage("");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("err");
      setErrorMsg(formatFeedbackError(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold text-muted mb-1.5 block">티커 *</label>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="예: SOXX, QDTE"
          className="w-full rounded-xl bg-elevated border border-line px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ring uppercase"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted mb-1.5 block">메모 (선택)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="종목명, ETF 여부 등 추가 설명"
          rows={3}
          className="w-full rounded-xl bg-elevated border border-line px-4 py-3 text-sm text-ink placeholder:text-faint resize-none focus:outline-none focus:border-ring"
        />
      </div>
      <p className="text-[11px] text-faint leading-relaxed">
        로그인 없이도 제출할 수 있습니다. 검토 후 데이터에 반영합니다.
      </p>
      {errorMsg && <p className="text-xs text-danger-text">{errorMsg}</p>}
      {status === "ok" && (
        <p className="text-xs text-accent-up font-medium">
          요청이 접수되었습니다. 반영까지 시간이 걸릴 수 있습니다.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
      >
        {status === "sending" ? "전송 중..." : "종목 추가 요청하기"}
      </button>
    </form>
  );
}
