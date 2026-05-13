"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { useNews, NewsArticle, NewsCategory } from "@/hooks/useNews";
import { formatDistanceToNow } from "@/components/home/newsUtils";

const BADGE_STYLES: Record<NewsCategory, string> = {
  긴급: "bg-red-500/15 text-red-500 border border-red-500/30",
  관세: "bg-orange-500/15 text-orange-500 border border-orange-500/30",
  기술: "bg-blue-500/15 text-blue-500 border border-blue-500/30",
  경제: "bg-purple-500/15 text-purple-500 border border-purple-500/30",
  뉴스: "bg-faint/20 text-muted border border-line",
};

const ALL_CATEGORIES: ("전체" | NewsCategory)[] = [
  "전체",
  "긴급",
  "관세",
  "기술",
  "경제",
  "뉴스",
];

function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_STYLES[category]}`}
    >
      {category}
    </span>
  );
}

function TranslatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 4h7M6 2v2M3 7c.5 2 2 3.5 4 4M9 4c-.5 3-3 6-7 7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 9l2 5M11 14l2-5M10 12h3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      번역됨
    </span>
  );
}

function ArticleCard({
  article,
  index,
}: {
  article: NewsArticle;
  index: number;
}) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className="group flex gap-4 p-4 rounded-2xl bg-panel border border-line hover:border-ring hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Thumbnail */}
      {article.urlToImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.urlToImage}
          alt=""
          className="w-20 h-16 object-cover rounded-lg shrink-0 bg-elevated"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-20 h-16 rounded-lg bg-elevated shrink-0 flex items-center justify-center text-2xl select-none">
          📰
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={article.category} />
          {article.translated && <TranslatedBadge />}
          {article.isMacro && (
            <span className="text-[10px] text-faint border border-line px-1.5 py-0.5 rounded-full">
              Global Macro
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent-down transition-colors">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-muted line-clamp-1">{article.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-faint mt-auto">
          <span className="font-medium">{article.source.name}</span>
          <span>·</span>
          <span>{formatDistanceToNow(article.publishedAt)}</span>
        </div>
      </div>
    </motion.a>
  );
}

export default function NewsPage() {
  const { articles, loading, error, refetch } = useNews();
  const [filter, setFilter] = useState<"전체" | NewsCategory>("전체");

  const filtered =
    filter === "전체" ? articles : articles.filter((a) => a.category === filter);

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-500 uppercase tracking-wider">
              Live
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink">뉴스 전체보기</h1>
              <p className="text-sm text-muted mt-1">
                전 세계 주요 이슈 &amp; 종목 관련 뉴스
              </p>
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 text-xs text-faint hover:text-muted border border-line hover:border-ring px-3 py-1.5 rounded-full transition-all"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M13.5 2.5A6.5 6.5 0 1 0 14.5 8" />
                <polyline points="14.5 2.5 14.5 6 11 6" />
              </svg>
              새로고침
            </button>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === cat
                  ? "bg-ink text-panel border-ink"
                  : "bg-transparent text-muted border-line hover:border-ring"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-2xl bg-panel border border-line"
              >
                <div className="w-20 h-16 rounded-lg bg-elevated animate-pulse shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3 w-16 bg-elevated rounded animate-pulse" />
                  <div className="h-4 w-full bg-elevated rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-elevated rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error || filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-4">🕊️</p>
            <p className="text-muted text-sm">현재 평화로운 시장 상황입니다</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {filtered.map((article, i) => (
                <ArticleCard key={article.id} article={article} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
