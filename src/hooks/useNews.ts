"use client";

import { useState, useEffect, useCallback } from "react";

export type NewsCategory = "긴급" | "관세" | "기술" | "경제" | "뉴스";

export interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
  category: NewsCategory;
  isMacro: boolean;
  translated: boolean;
}

interface RawArticle {
  title?: string;
  description?: string | null;
  url?: string;
  urlToImage?: string | null;
  publishedAt?: string;
  source?: { name?: string };
  category?: NewsCategory;
  translated?: boolean;
}

async function fetchArticles(
  type: "macro" | "ticker",
  ticker?: string
): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ type });
  if (ticker) params.set("ticker", ticker);

  const res = await fetch(`/api/news?${params.toString()}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.articles ?? [])
    .filter((a: RawArticle) => a.title && a.url)
    .map((a: RawArticle, i: number) => ({
      id: `${type}-${i}-${a.publishedAt}`,
      title: a.title ?? "",
      description: a.description ?? null,
      url: a.url ?? "",
      urlToImage: a.urlToImage ?? null,
      publishedAt: a.publishedAt ?? "",
      source: { name: a.source?.name ?? "Unknown" },
      category: a.category ?? "뉴스",
      isMacro: type === "macro",
      translated: a.translated ?? false,
    }));
}

export function useNews(ticker?: string) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const macroArticles = await fetchArticles("macro");

      let tickerArticles: NewsArticle[] = [];
      if (ticker) {
        tickerArticles = await fetchArticles("ticker", ticker);
      }

      const seen = new Set<string>();
      const combined: NewsArticle[] = [];
      for (const a of [...macroArticles, ...tickerArticles]) {
        if (!seen.has(a.url)) {
          seen.add(a.url);
          combined.push(a);
        }
      }

      setArticles(combined);
    } catch {
      setError("뉴스를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    load();
  }, [load]);

  return { articles, loading, error, refetch: load };
}
