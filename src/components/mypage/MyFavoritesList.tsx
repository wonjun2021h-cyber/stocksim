"use client";

import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import { StockLogo } from "@/components/ui/StockLogo";
import { FavoriteButton } from "@/components/stock/FavoriteButton";

export function MyFavoritesList() {
  const { favorites, loading } = useFavorites();

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center">불러오는 중...</p>;
  }

  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl bg-panel border border-line p-6 text-center">
        <p className="text-sm text-muted mb-4">찜한 종목이 없습니다.</p>
        <Link
          href="/stocks"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-panel text-sm font-bold hover:opacity-80"
        >
          종목 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <ul className="rounded-2xl bg-panel border border-line dark:border-transparent overflow-hidden divide-y divide-line">
      {favorites.map((fav) => (
        <li key={fav.id} className="flex items-center gap-3 px-4 py-3.5">
          <Link
            href={`/stock/${encodeURIComponent(fav.ticker)}`}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <StockLogo ticker={fav.ticker} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{fav.name}</p>
              <p className="text-xs text-subtle">{fav.ticker}</p>
            </div>
          </Link>
          <FavoriteButton ticker={fav.ticker} name={fav.name} size="sm" />
        </li>
      ))}
    </ul>
  );
}
