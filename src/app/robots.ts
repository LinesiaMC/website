import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/fr/admin",
          "/fr/admin/",
          "/en/admin",
          "/en/admin/",
          "/fr/account",
          "/en/account",
          "/fr/profile",
          "/en/profile",
        ],
      },
      {
        userAgent: ["Googlebot", "Bingbot", "DuckDuckBot", "YandexBot", "Applebot"],
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://www.linesia.net/sitemap.xml",
    host: "https://www.linesia.net",
  };
}
