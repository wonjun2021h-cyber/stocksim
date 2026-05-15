"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNews, NewsArticle, NewsCategory } from "@/hooks/useNews";
import { formatDistanceToNow } from "./newsUtils";

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  긴급: "text-red-500 bg-red-500",
  속보: "text-orange-500 bg-orange-500",
  기술: "text-blue-500 bg-blue-500",
  경제: "text-purple-500 bg-purple-500",
  종목: "text-emerald-500 bg-emerald-500",
  뉴스: "text-muted bg-muted",
};

function TimelineDot({ category }: { category: NewsCategory }) {
  const color = CATEGORY_COLORS[category].split(" ")[1];
  return (
    <div className="relative flex items-center justify-center">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {(category === "긴급" || category === "속보") && (
        <span
          className={`absolute w-2 h-2 rounded-full ${color} animate-ping opacity-60`}
        />
      )}
    </div>
  );
}

function NewsItem({ article, index }: { article: NewsArticle; index: number }) {
  const textColor = CATEGORY_COLORS[article.category].split(" ")[0];

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="group flex items-start gap-3 py-2.5 hover:bg-elevated/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
    >
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <TimelineDot category={article.category} />
        <div className="w-px h-full bg-line/50 mt-1" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold ${textColor}`}>
            {article.category}
          </span>
          <span className="text-[10px] text-faint">
            {formatDistanceToNow(article.publishedAt)}
          </span>
        </div>
        <p className="text-[13px] text-ink font-medium leading-snug line-clamp-2 group-hover:text-accent-down transition-colors">
          {article.title}
        </p>
        <p className="text-[11px] text-muted mt-0.5 truncate">
          {article.source}
        </p>
      </div>
    </motion.a>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <div className="w-2 h-2 rounded-full bg-elevated animate-pulse mt-1.5" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-2.5 w-20 bg-elevated rounded animate-pulse" />
            <div className="h-3.5 w-full bg-elevated rounded animate-pulse" />
            <div className="h-2.5 w-16 bg-elevated rounded animate-pulse" />
          </div>
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
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          실시간 브리핑
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
