"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  addFavorite,
  fetchUserFavorites,
  removeFavorite,
} from "@/lib/supabase";
import type { DBFavorite } from "@/lib/portfolio-types";

interface FavoritesContextValue {
  favorites: DBFavorite[];
  loading: boolean;
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (ticker: string, name: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(
  null
);

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}

export function useFavoritesState(): FavoritesContextValue {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<DBFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchUserFavorites(user.id);
      setFavorites(data);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const favoriteTickers = useMemo(
    () => new Set(favorites.map((f) => f.ticker.toUpperCase())),
    [favorites]
  );

  const isFavorite = useCallback(
    (ticker: string) => favoriteTickers.has(ticker.toUpperCase()),
    [favoriteTickers]
  );

  const toggleFavorite = useCallback(
    async (ticker: string, name: string) => {
      if (!user) return false;

      const upper = ticker.toUpperCase();
      if (favoriteTickers.has(upper)) {
        await removeFavorite(user.id, upper);
        setFavorites((prev) =>
          prev.filter((f) => f.ticker.toUpperCase() !== upper)
        );
        return false;
      }

      const added = await addFavorite(user.id, upper, name);
      setFavorites((prev) => [added, ...prev]);
      return true;
    },
    [user, favoriteTickers]
  );

  return useMemo(
    () => ({
      favorites,
      loading,
      isFavorite,
      toggleFavorite,
      refresh,
    }),
    [favorites, loading, isFavorite, toggleFavorite, refresh]
  );
}
