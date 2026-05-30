import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { readStockIndex } from "@/lib/stock-index-server";

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/stocks", priority: 0.9, changeFrequency: "daily" },
  { path: "/backtest", priority: 0.9, changeFrequency: "weekly" },
  { path: "/compound", priority: 0.7, changeFrequency: "monthly" },
  { path: "/news", priority: 0.8, changeFrequency: "daily" },
  { path: "/request-stock", priority: 0.5, changeFrequency: "monthly" },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${base}${path || "/"}`,
      lastModified: now,
      changeFrequency,
      priority,
    })
  );

  const stockEntries: MetadataRoute.Sitemap = readStockIndex().map((stock) => ({
    url: `${base}/stock/${encodeURIComponent(stock.ticker)}`,
    lastModified: stock.endDate ? new Date(stock.endDate) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...stockEntries];
}
