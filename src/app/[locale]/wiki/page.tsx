export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getWikiPages } from "@/lib/wiki";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Wiki — Guides & mécaniques" : "Wiki — Guides & mechanics",
    description: fr
      ? "Le wiki officiel Linesia : guides SkyFaction, mécaniques PvP, jobs, prestige, KitFFA, Kitmap, commandes et astuces pour progresser sur le serveur Minecraft Bedrock FR."
      : "Official Linesia wiki: SkyFaction guides, PvP mechanics, jobs, prestige, KitFFA, Kitmap, commands and tips for the Minecraft Bedrock server.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/wiki`,
      languages: {
        fr: "https://www.linesia.net/fr/wiki",
        en: "https://www.linesia.net/en/wiki",
      },
    },
  };
}
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WikiContent from "./WikiContent";

export default async function WikiPage() {
  const pages = await getWikiPages();

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="pt-28 pb-20">
        <WikiContent pages={pages} />
      </div>
      <Footer />
    </main>
  );
}
