"use client";

import { useState, useEffect, useCallback } from "react";

export type NewsCategory = "긴급" | "속보" | "기술" | "경제" | "종목" | "뉴스";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
  category: NewsCategory;
  related: string | null;
  translated: boolean;
}

interface RawArticle {
  id?: number;
  title?: string;
  summary?: string;
  url?: string;
  image?: string | null;
  publishedAt?: string;
  source?: string;
  category?: NewsCategory;
  related?: string | null;
  translated?: boolean;
}

async function fetchArticles(
  type: "market" | "company",
  ticker?: string
): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ type });
  if (ticker) params.set("ticker", ticker);

  const res = await fetch(`/api/news?${params.toString()}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.articles ?? [])
    .filter((a: RawArticle) => a.title && a.url)
    .map((a: RawArticle) => ({
      id: String(a.id ?? Math.random()),
      title: a.title ?? "",
      summary: a.summary ?? "",
      url: a.url ?? "",
      image: a.image ?? null,
      publishedAt: a.publishedAt ?? "",
      source: a.source ?? "Unknown",
      category: a.category ?? "뉴스",
      related: a.related ?? null,
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
      const marketArticles = await fetchArticles("market");

      let companyArticles: NewsArticle[] = [];
      if (ticker) {
        companyArticles = await fetchArticles("company", ticker);
      }

      const seen = new Set<string>();
      const combined: NewsArticle[] = [];
      for (const a of [...marketArticles, ...companyArticles]) {
        if (!seen.has(a.url)) {
          seen.add(a.url);
          combined.push(a);
        }
      }

      combined.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );

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
