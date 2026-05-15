"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNews, NewsArticle, NewsCategory } from "@/hooks/useNews";
import { formatDistanceToNow } from "./newsUtils";

const CATEGORY_CONFIG: Record<
  NewsCategory,
  { color: string; dot: string; bg: string }
> = {
  긴급: { color: "text-red-500", dot: "bg-red-500", bg: "bg-red-500/8" },
  속보: {
    color: "text-orange-500",
    dot: "bg-orange-500",
    bg: "bg-orange-500/8",
  },
  기술: { color: "text-blue-500", dot: "bg-blue-500", bg: "bg-blue-500/8" },
  경제: {
    color: "text-purple-500",
    dot: "bg-purple-500",
    bg: "bg-purple-500/8",
  },
  종목: {
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/8",
  },
  뉴스: { color: "text-muted", dot: "bg-muted", bg: "bg-faint/10" },
};

function IssueCard({
  article,
  index,
}: {
  article: NewsArticle;
  index: number;
}) {
  const config = CATEGORY_CONFIG[article.category];

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={`group block p-3 rounded-xl ${config.bg} border border-line/30 hover:border-line transition-all cursor-pointer`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          <span className={`text-[10px] font-bold ${config.color}`}>
            {article.category}
          </span>
        </div>
        <span className="text-[10px] text-faint ml-auto shrink-0">
          {formatDistanceToNow(article.publishedAt)}
        </span>
      </div>

      <p className="text-xs text-ink font-medium leading-snug line-clamp-2 mt-1.5 group-hover:text-accent-down transition-colors">
        {article.title}
      </p>

      {article.summary && (
        <p className="text-[11px] text-muted line-clamp-1 mt-1">
          {article.summary}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 text-[10px] text-faint">
        <span>{article.source}</span>
        {article.related && (
          <>
            <span>·</span>
            <span className="text-accent-down font-medium">
              ${article.related}
            </span>
          </>
        )}
      </div>
    </motion.a>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl bg-elevated/30 border border-line/30 flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-elevated animate-pulse" />
            <div className="h-2.5 w-12 bg-elevated rounded animate-pulse" />
          </div>
          <div className="h-3.5 w-full bg-elevated rounded animate-pulse" />
          <div className="h-2.5 w-2/3 bg-elevated rounded animate-pulse" />
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <h3 className="text-sm font-bold text-ink tracking-tight">
            실시간 이슈
          </h3>
        </div>
        <a
          href="/news"
          className="text-[11px] text-faint hover:text-muted px-2 py-0.5 rounded-full border border-line hover:border-ring transition-all"
        >
          전체보기
        </a>
      </div>

      {loading ? (
        <BoardSkeleton />
      ) : error || displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center text-sm text-muted"
        >
          현재 평화로운 시장 상황입니다 🕊️
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-2">
            {displayed.map((article, i) => (
              <IssueCard key={article.id} article={article} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
