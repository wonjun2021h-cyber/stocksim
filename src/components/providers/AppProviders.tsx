"use client";

import { FavoritesContext, useFavoritesState } from "@/hooks/useFavorites";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const value = useFavoritesState();

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
