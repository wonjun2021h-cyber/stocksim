"use client";

import { useState } from "react";
import { submitUserFeedback, formatFeedbackError } from "@/lib/feedback";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [discordSent, setDiscordSent] = useState<boolean | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setErrorMsg("5자 이상 입력해 주세요.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    setDiscordSent(null);
    try {
      const result = await submitUserFeedback(message);
      setMessage("");
      setDiscordSent(result.discordSent);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("err");
      setErrorMsg(formatFeedbackError(err));
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
        <p className="text-xs text-accent-up font-medium">
          의견이 전달되었습니다. 감사합니다!
          {discordSent === false && (
            <span className="block text-faint mt-1">
              (Discord 알림은 전송되지 않았습니다. .env.local의 DISCORD_WEBHOOK_URL을 확인해 주세요.)
            </span>
          )}
        </p>
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
