import { NextRequest, NextResponse } from "next/server";

const API_KEY = "af78accbc0234420b58a147955356df0";
const BASE_URL = "https://newsapi.org/v2/everything";
const MACRO_QUERY =
  "war OR tariff OR trade OR inflation OR recession OR federal+reserve OR sanctions OR GDP";

type NewsCategory = "긴급" | "관세" | "기술" | "경제" | "뉴스";

function categorize(title: string, description: string | null): NewsCategory {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (/war|attack|military|conflict|missile|invasion|crisis|strike|troops/.test(text))
    return "긴급";
  if (/tariff|trade|import|export|wto|customs|duty|sanction/.test(text))
    return "관세";
  if (/tech|ai|artificial intelligence|chip|semiconductor|nvidia|apple|google|microsoft|robot/.test(text))
    return "기술";
  if (/fed|federal reserve|interest rate|inflation|gdp|economy|recession|employment|cpi/.test(text))
    return "경제";
  return "뉴스";
}

async function translateToKorean(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  try {
    const encoded = encodeURIComponent(text.slice(0, 500));
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encoded}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return text;
    const data = await res.json();
    // Response format: [[["translated","original",...],...],...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .map((seg: [string]) => seg[0])
        .join("");
      return translated || text;
    }
    return text;
  } catch {
    return text;
  }
}

interface RawArticle {
  title?: string;
  description?: string | null;
  url?: string;
  urlToImage?: string | null;
  publishedAt?: string;
  source?: { name?: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "macro";
  const ticker = searchParams.get("ticker") ?? "";
  const query = type === "ticker" && ticker ? ticker : MACRO_QUERY;

  try {
    const newsUrl = new URL(BASE_URL);
    newsUrl.searchParams.set("q", query);
    newsUrl.searchParams.set("language", "en");
    newsUrl.searchParams.set("sortBy", "publishedAt");
    newsUrl.searchParams.set("pageSize", type === "ticker" ? "5" : "10");
    newsUrl.searchParams.set("apiKey", API_KEY);

    const newsRes = await fetch(newsUrl.toString(), { cache: "no-store" });

    if (!newsRes.ok) {
      return NextResponse.json({ articles: [] }, { status: newsRes.status });
    }

    const newsData = await newsRes.json();
    const raw: RawArticle[] = (newsData.articles ?? []).filter(
      (a: RawArticle) => a.title && a.url && a.title !== "[Removed]"
    );

    // Categorize on original English text
    const categories = raw.map((a) =>
      categorize(a.title ?? "", a.description ?? null)
    );

    // Translate in parallel — but if any fail, keep original
    const translationResults = await Promise.all(
      raw.map(async (a, i) => {
        const [translatedTitle, translatedDesc] = await Promise.all([
          translateToKorean(a.title ?? ""),
          a.description ? translateToKorean(a.description) : Promise.resolve(null),
        ]);

        const titleChanged = translatedTitle !== a.title;
        const descChanged = translatedDesc !== a.description;
        const wasTranslated = titleChanged || descChanged;

        return {
          title: translatedTitle || a.title,
          description: translatedDesc ?? a.description ?? null,
          url: a.url,
          urlToImage: a.urlToImage ?? null,
          publishedAt: a.publishedAt,
          source: { name: a.source?.name ?? "Unknown" },
          category: categories[i],
          translated: wasTranslated,
        };
      })
    );

    return NextResponse.json({ articles: translationResults });
  } catch {
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
