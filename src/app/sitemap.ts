import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";

const SITE = "https://www.linesia.net";
const LOCALES = ["fr", "en"] as const;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/news", priority: 0.9, changeFrequency: "daily" },
  { path: "/store", priority: 0.9, changeFrequency: "weekly" },
  { path: "/wiki", priority: 0.8, changeFrequency: "weekly" },
  { path: "/leaderboard", priority: 0.8, changeFrequency: "daily" },
  { path: "/vote", priority: 0.8, changeFrequency: "daily" },
  { path: "/community", priority: 0.7, changeFrequency: "daily" },
  { path: "/support", priority: 0.6, changeFrequency: "monthly" },
  { path: "/parrainage", priority: 0.6, changeFrequency: "monthly" },
];

function altLangs(path: string) {
  return {
    languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE}/${l}${path}`])),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, changeFrequency } of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE}/${locale}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
        alternates: altLangs(path),
      });
    }
  }

  try {
    const articles = await getArticles();
    for (const a of articles) {
      const path = `/news/${a.id}`;
      entries.push({
        url: `${SITE}/${a.locale}${path}`,
        lastModified: a.date ? new Date(a.date) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // DB unavailable at build; skip dynamic entries.
  }

  return entries;
}
