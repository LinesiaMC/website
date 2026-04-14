import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Voter pour Linesia — Récompenses quotidiennes" : "Vote for Linesia — Daily rewards",
    description: fr
      ? "Vote chaque jour pour Linesia sur les tops serveurs Minecraft Bedrock et gagne des gemmes, clés et récompenses exclusives. Soutiens le serveur !"
      : "Vote daily for Linesia on the top Minecraft Bedrock server lists and earn gems, keys and exclusive rewards.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/vote`,
      languages: {
        fr: "https://www.linesia.net/fr/vote",
        en: "https://www.linesia.net/en/vote",
      },
    },
  };
}

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
