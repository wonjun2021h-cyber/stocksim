"use client";

import { useState } from "react";
import { submitUserFeedback } from "@/lib/feedback";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setErrorMsg("5자 이상 입력해 주세요.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      await submitUserFeedback(message);
      setMessage("");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("err");
      setErrorMsg(err instanceof Error ? err.message : "전송에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="버그, 기능 제안, 불편한 점 등을 적어 주세요. (로그인한 계정으로만 접수됩니다)"
        rows={4}
        className="w-full rounded-xl bg-elevated border border-line px-4 py-3 text-sm text-ink placeholder:text-faint resize-none focus:outline-none focus:border-ring"
      />
      {errorMsg && <p className="text-xs text-danger-text">{errorMsg}</p>}
      {status === "ok" && (
        <p className="text-xs text-accent-up font-medium">의견이 전달되었습니다. 감사합니다!</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="self-end px-5 py-2.5 rounded-full bg-ink text-panel text-sm font-bold hover:opacity-80 disabled:opacity-50"
      >
        {status === "sending" ? "전송 중..." : "의견 보내기"}
      </button>
    </form>
  );
}
