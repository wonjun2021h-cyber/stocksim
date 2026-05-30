import type { BacktestResponse } from "@/lib/portfolio-types";

export function buildPortfolioSharePayload(result: BacktestResponse) {
  const { meta, allocation } = result;
  return {
    initialInvestment: meta.initialInvestment,
    monthlyDCA: meta.monthlyDCA,
    durationYears: meta.durationYears,
    items: allocation.map(({ ticker, name, weight }) => ({
      ticker,
      name,
      weight,
    })),
  };
}

export function buildPortfolioShareUrl(result: BacktestResponse): string {
  const payload = buildPortfolioSharePayload(result);
  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  return `${window.location.origin}/backtest?load=${encoded}`;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fallback below */
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const ok = document.execCommand("copy");
    if (!ok) throw new Error("클립보드 복사에 실패했습니다.");
  } finally {
    document.body.removeChild(textarea);
  }
}
