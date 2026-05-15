import { NextRequest, NextResponse } from "next/server";

type NewsCategory = "긴급" | "속보" | "기술" | "경제" | "종목" | "뉴스";

// Yahoo Finance RSS feeds — no API key needed, real-time
const MARKET_RSS_FEEDS = [
  "https://feeds.finance.yahoo.com/rss/2.0/headline?region=US&lang=en-US",
  "https://finance.yahoo.com/news/rssindex",
];

function getRssUrl(ticker: string) {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
}

function categorize(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (
    /breaking|urgent|war|attack|missile|invasion|crisis|conflict|strike|troops|emergency/.test(
      text
    )
  )
    return "긴급";
  if (
    /tariff|trade|sanction|import|export|customs|duty|deal|agreement/.test(text)
  )
    return "속보";
  if (
    /tech|ai|artificial intelligence|chip|semiconductor|nvidia|apple|google|microsoft|robot|software|openai|meta/.test(
      text
    )
  )
    return "기술";
  if (
    /fed|federal reserve|interest rate|inflation|gdp|economy|recession|employment|cpi|treasury|bond|rate/.test(
      text
    )
  )
    return "경제";
  if (
    /surge|crash|rally|plunge|record|beat|miss|earnings|profit|revenue|stock/.test(
      text
    )
  )
    return "속보";
  return "뉴스";
}

interface ParsedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  ).exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainMatch = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
    "i"
  ).exec(xml);
  if (plainMatch) return plainMatch[1].trim();

  return "";
}

function parseRSS(xml: string, sourceName: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const description = extractTag(block, "description");
    const link =
      extractTag(block, "link") || extractTag(block, "guid") || "";
    const pubDate = extractTag(block, "pubDate");

    if (title && link) {
      items.push({ title, description, link, pubDate, source: sourceName });
    }
  }

  return items;
}

async function translateToKorean(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  try {
    const encoded = encodeURIComponent(text.slice(0, 300));
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encoded}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((seg: [string]) => seg[0]).join("") || text;
    }
    return text;
  } catch {
    return text;
  }
}

async function fetchRSS(url: string, sourceName: string): Promise<ParsedItem[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; stocksim/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, sourceName);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "market";
  const ticker = searchParams.get("ticker") ?? "";

  try {
    let rawItems: ParsedItem[] = [];

    if (type === "company" && ticker) {
      rawItems = await fetchRSS(getRssUrl(ticker), ticker.toUpperCase());
    } else {
      const results = await Promise.all(
        MARKET_RSS_FEEDS.map((feed, i) =>
          fetchRSS(feed, i === 0 ? "Yahoo Finance" : "Yahoo Finance")
        )
      );
      const seen = new Set<string>();
      for (const items of results) {
        for (const item of items) {
          if (!seen.has(item.link)) {
            seen.add(item.link);
            rawItems.push(item);
          }
        }
      }
    }

    // Sort by date descending
    rawItems.sort((a, b) => {
      const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return tb - ta;
    });

    const sliced = rawItems.slice(0, 15);

    const articles = await Promise.all(
      sliced.map(async (item, i) => {
        const category =
          type === "company" && ticker
            ? "종목"
            : categorize(item.title, item.description);

        const summaryRaw = item.description
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim()
          .slice(0, 150);

        const [translatedTitle, translatedSummary] = await Promise.all([
          translateToKorean(item.title),
          summaryRaw ? translateToKorean(summaryRaw) : Promise.resolve(""),
        ]);

        const publishedAt = item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString();

        return {
          id: `${i}-${publishedAt}`,
          title: translatedTitle,
          summary: translatedSummary,
          url: item.link,
          image: null,
          publishedAt,
          source: item.source,
          category,
          related: type === "company" && ticker ? ticker : null,
          translated: translatedTitle !== item.title,
        };
      })
    );

    return NextResponse.json({ articles });
  } catch {
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
