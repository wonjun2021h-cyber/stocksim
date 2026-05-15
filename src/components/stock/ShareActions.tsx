"use client";

import { useState } from "react";
import html2canvas from "html2canvas";

const CAPTURE_ID = "result-share-capture";

export interface ShareActionsProps {
  ticker: string;
}

export function ShareActions({ ticker }: ShareActionsProps) {
  const [saving, setSaving] = useState(false);

  async function handleSaveImage() {
    const source = document.getElementById(CAPTURE_ID);
    if (!source || saving) return;

    setSaving(true);
    const clone = source.cloneNode(true) as HTMLElement;

    try {
      clone.querySelectorAll("[data-no-share]").forEach((el) => el.remove());

      clone.id = "";
      clone.style.position = "fixed";
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.zIndex = "-1";
      clone.style.width = `${source.offsetWidth}px`;
      clone.style.margin = "0";
      document.body.appendChild(clone);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(clone, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `stocksim-${ticker}-result.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    } catch {
      alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      setSaving(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("링크가 복사되었습니다!");
    });
  }

  return (
    <div className="flex items-center gap-3 justify-center flex-wrap">
      <button
        type="button"
        onClick={handleSaveImage}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-page hover:opacity-90 text-xs font-semibold transition-opacity duration-150 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {saving ? "저장 중…" : "이미지 저장"}
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-elevated hover:bg-muted-row text-muted hover:text-ink text-xs transition-colors duration-150 border border-line/70 dark:border-transparent"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        링크 복사
      </button>
    </div>
  );
}

export { CAPTURE_ID };
