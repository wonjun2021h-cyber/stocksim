"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNews, NewsArticle, NewsCategory } from "@/hooks/useNews";
import { formatDistanceToNow } from "./newsUtils";

const BADGE_STYLES: Record<NewsCategory, string> = {
  긴급: "bg-red-500/15 text-red-500 border border-red-500/30",
  관세: "bg-orange-500/15 text-orange-500 border border-orange-500/30",
  기술: "bg-blue-500/15 text-blue-500 border border-blue-500/30",
  경제: "bg-purple-500/15 text-purple-500 border border-purple-500/30",
  뉴스: "bg-faint/20 text-muted border border-line",
};

function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${BADGE_STYLES[category]}`}
    >
      {category}
    </span>
  );
}

function TranslatedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
      <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 4h7M6 2v2M3 7c.5 2 2 3.5 4 4M9 4c-.5 3-3 6-7 7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 9l2 5M11 14l2-5M10 12h3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      번역됨
    </span>
  );
}

function NewsItem({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
      className="group flex flex-col gap-1.5 py-3 border-b border-line last:border-0 hover:bg-elevated/40 px-1 rounded-md transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryBadge category={article.category} />
        {article.translated && <TranslatedBadge />}
      </div>
      <p className="text-sm text-ink font-medium leading-snug line-clamp-2 group-hover:text-accent-down transition-colors">
        {article.title}
      </p>
      <div className="flex items-center gap-2 text-[11px] text-faint">
        <span>{article.source.name}</span>
        <span>·</span>
        <span>{formatDistanceToNow(article.publishedAt)}</span>
      </div>
    </motion.a>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 py-3 border-b border-line last:border-0">
          <div className="h-3 w-16 bg-elevated rounded animate-pulse" />
          <div className="h-4 w-full bg-elevated rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-elevated rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface NewsPanelProps {
  limit?: number;
}

export function NewsPanel({ limit = 6 }: NewsPanelProps) {
  const { articles, loading, error } = useNews();

  const displayed = articles.slice(0, limit);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          실시간 뉴스
        </h2>
        <a
          href="/news"
          className="text-[11px] text-faint hover:text-muted transition-colors"
        >
          전체보기 →
        </a>
      </div>

      {loading ? (
        <NewsSkeleton />
      ) : error || displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-6 text-center text-sm text-muted"
        >
          현재 평화로운 시장 상황입니다 🕊️
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col">
            {displayed.map((article, i) => (
              <NewsItem key={article.id} article={article} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
