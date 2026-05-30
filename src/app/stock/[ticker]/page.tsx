"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { HeaderToolbar } from "@/components/layout/HeaderToolbar";
import { NavbarSearch } from "@/components/layout/NavbarSearch";
import { StockHeader } from "@/components/stock/StockHeader";
import { CalculatorForm } from "@/components/stock/CalculatorForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAndParseStocks, fetchAllStocks } from "@/lib/csvParser";
import { loadStockByTicker } from "@/lib/stockDataLoader";
import type { StockInfo } from "@/lib/types";

export default function StockCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = decodeURIComponent(params.ticker as string);

  const [stock, setStock] = useState<StockInfo | null>(null);
  const [allStocks, setAllStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAndParseStocks(), fetchAllStocks()]).then(
      async ([map, all]) => {
        setAllStocks(all);

        const jsonStock = await loadStockByTicker(ticker);
        if (jsonStock) {
          setStock(jsonStock);
          setLoading(false);
          return;
        }

        const found =
          map.get(ticker) ?? map.get(ticker.toUpperCase());
        if (!found) {
          router.replace("/");
          return;
        }
        setStock(found);
        setLoading(false);
      }
    );
  }, [ticker, router]);

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between min-w-0 pr-3 md:pr-6">
        <Navbar />
        <HeaderToolbar>
          <div className="flex flex-1 md:flex-none min-w-0 justify-end max-w-[calc(100vw-7rem)] md:max-w-none">
            <NavbarSearch stocks={allStocks} />
          </div>
        </HeaderToolbar>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <div className="rounded-2xl bg-panel p-6 space-y-6 border border-line dark:border-transparent">
          {loading || !stock ? (
            <>
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            </>
          ) : (
            <>
              <StockHeader stock={stock} />
              <CalculatorForm ticker={ticker} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
