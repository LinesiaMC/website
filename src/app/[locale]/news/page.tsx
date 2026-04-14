export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getArticlesByLocale } from "@/lib/articles";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsContent from "./NewsContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Actualités & nouveautés" : "News & updates",
    description: fr
      ? "Toutes les actualités de Linesia : mises à jour SkyFaction, modes temporaires, KitFFA, événements PvP et annonces du serveur Minecraft Bedrock FR."
      : "All Linesia news: SkyFaction updates, limited-time modes, KitFFA, PvP events and announcements from the Minecraft Bedrock server.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/news`,
      languages: {
        fr: "https://www.linesia.net/fr/news",
        en: "https://www.linesia.net/en/news",
      },
    },
  };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const articles = await getArticlesByLocale(locale);

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="pt-28 pb-20">
        <NewsContent articles={articles} />
      </div>
      <Footer />
    </main>
  );
}
