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

const BADGE_DOT: Record<NewsCategory, string> = {
  긴급: "bg-red-500",
  관세: "bg-orange-500",
  기술: "bg-blue-500",
  경제: "bg-purple-500",
  뉴스: "bg-faint",
};

function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${BADGE_STYLES[category]}`}
    >
      <span className={`w-1 h-1 rounded-full ${BADGE_DOT[category]}`} />
      {category}
    </span>
  );
}

function IssueItem({ article, index }: { article: NewsArticle; index: number }) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      className="group block p-3 rounded-xl bg-elevated/50 hover:bg-elevated border border-line/50 hover:border-line transition-all cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <CategoryBadge category={article.category} />
          <p className="text-xs text-ink font-medium leading-snug line-clamp-2 group-hover:text-accent-down transition-colors">
            {article.title}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-faint">
            <span className="truncate">{article.source.name}</span>
            <span>·</span>
            <span className="shrink-0">{formatDistanceToNow(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </motion.a>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-elevated/50 border border-line/50 flex flex-col gap-1.5">
          <div className="h-3 w-10 bg-elevated rounded animate-pulse" />
          <div className="h-3 w-full bg-elevated rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-elevated rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface LiveIssueBoardProps {
  ticker?: string;
  limit?: number;
}

export function LiveIssueBoard({ ticker, limit = 7 }: LiveIssueBoardProps) {
  const { articles, loading, error } = useNews(ticker);

  const displayed = articles.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-sm font-bold text-ink tracking-tight">
            Live Issue Board
          </h3>
        </div>
        <a
          href="/news"
          className="text-[11px] text-faint hover:text-muted px-2 py-0.5 rounded-full border border-line hover:border-ring transition-all"
        >
          전체보기
        </a>
      </div>

      {/* Content */}
      {loading ? (
        <BoardSkeleton />
      ) : error || displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center text-sm text-muted"
        >
          <p className="text-2xl mb-2">🕊️</p>
          <p>현재 평화로운 시장 상황입니다</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-2">
            {displayed.map((article, i) => (
              <IssueItem key={article.id} article={article} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
