"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { useNews, NewsArticle, NewsCategory } from "@/hooks/useNews";
import { formatDistanceToNow } from "@/components/home/newsUtils";

const CATEGORY_CONFIG: Record<
  NewsCategory,
  { color: string; dot: string; border: string }
> = {
  긴급: {
    color: "text-red-500",
    dot: "bg-red-500",
    border: "border-red-500/30",
  },
  속보: {
    color: "text-orange-500",
    dot: "bg-orange-500",
    border: "border-orange-500/30",
  },
  기술: {
    color: "text-blue-500",
    dot: "bg-blue-500",
    border: "border-blue-500/30",
  },
  경제: {
    color: "text-purple-500",
    dot: "bg-purple-500",
    border: "border-purple-500/30",
  },
  종목: {
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  뉴스: {
    color: "text-muted",
    dot: "bg-muted",
    border: "border-line",
  },
};

const ALL_CATEGORIES: ("전체" | NewsCategory)[] = [
  "전체",
  "긴급",
  "속보",
  "기술",
  "경제",
  "종목",
  "뉴스",
];

function TimelineItem({
  article,
  index,
  isLast,
}: {
  article: NewsArticle;
  index: number;
  isLast: boolean;
}) {
  const config = CATEGORY_CONFIG[article.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
      className="flex gap-4"
    >
      {/* Timeline track */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative">
          <span className={`block w-2.5 h-2.5 rounded-full ${config.dot}`} />
          {(article.category === "긴급" || article.category === "속보") && (
            <span
              className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.dot} animate-ping opacity-50`}
            />
          )}
        </div>
        {!isLast && <div className="w-px flex-1 bg-line/40 mt-1" />}
      </div>

      {/* Content */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex-1 pb-6 cursor-pointer`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[11px] font-bold ${config.color}`}>
            {article.category}
          </span>
          <span className="text-[11px] text-faint">
            {formatDistanceToNow(article.publishedAt)}
          </span>
          {article.related && (
            <span className="text-[10px] font-medium text-accent-down bg-accent-down/8 px-1.5 py-0.5 rounded">
              ${article.related}
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-ink leading-snug group-hover:text-accent-down transition-colors">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
            {article.summary}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-[11px] text-faint">
          <span className="font-medium">{article.source}</span>
          {article.translated && (
            <>
              <span>·</span>
              <span className="text-emerald-600">번역됨</span>
            </>
          )}
        </div>
      </a>
    </motion.div>
  );
}

export default function NewsPage() {
  const { articles, loading, error, refetch } = useNews();
  const [filter, setFilter] = useState<"전체" | NewsCategory>("전체");

  const filtered =
    filter === "전체"
      ? articles
      : articles.filter((a) => a.category === filter);

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between pr-6">
        <Navbar />
        <HeaderToolbar />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
              Live Feed
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink">시장 브리핑</h1>
              <p className="text-sm text-muted mt-1">
                실시간 글로벌 시장 뉴스 요약
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

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
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

        {/* Timeline feed */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-elevated animate-pulse" />
                  <div className="w-px flex-1 bg-line/40 mt-1" />
                </div>
                <div className="flex-1 pb-6 flex flex-col gap-2">
                  <div className="h-3 w-24 bg-elevated rounded animate-pulse" />
                  <div className="h-4 w-full bg-elevated rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-elevated rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error || filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted text-sm">
              {error ?? (filter === "전체" ? "뉴스를 불러오지 못했습니다" : "해당 카테고리의 뉴스가 없습니다")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {filtered.map((article, i) => (
                <TimelineItem
                  key={article.id}
                  article={article}
                  index={i}
                  isLast={i === filtered.length - 1}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
