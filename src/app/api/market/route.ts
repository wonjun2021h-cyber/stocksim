import { NextResponse } from "next/server";

const SYMBOLS = {
  nasdaq: "^IXIC",
  sp500: "^GSPC",
  usdKrw: "KRW=X",
};

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
}

async function fetchQuote(
  symbol: string
): Promise<{ price: number; change: number; changePercent: number; isUp: boolean } | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
      // Cache at the fetch level — Next.js will also revalidate at route level
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta: YahooMeta = json?.chart?.result?.[0]?.meta ?? {};
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    if (!price || !prevClose) return null;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      isUp: change >= 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [nasdaq, sp500, usdKrw] = await Promise.all([
    fetchQuote(SYMBOLS.nasdaq),
    fetchQuote(SYMBOLS.sp500),
    fetchQuote(SYMBOLS.usdKrw),
  ]);

  // Fallback values if Yahoo Finance is unavailable
  const fallback = (price: number) => ({
    price,
    change: 0,
    changePercent: 0,
    isUp: true,
  });

  return NextResponse.json(
    {
      nasdaq: nasdaq ?? fallback(24836.78),
      sp500: sp500 ?? fallback(7165.08),
      usdKrw: usdKrw ?? fallback(1480.8),
      cachedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
