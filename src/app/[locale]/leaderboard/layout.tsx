import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Classement joueurs — Top PvP, temps de jeu, kills" : "Leaderboard — Top PvP, playtime, kills",
    description: fr
      ? "Classement officiel Linesia : top joueurs par temps de jeu, kills PvP, prestige, argent et jobs sur le serveur Minecraft Bedrock FR."
      : "Official Linesia leaderboard: top players by playtime, PvP kills, prestige, money and jobs on the Minecraft Bedrock server.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/leaderboard`,
      languages: {
        fr: "https://www.linesia.net/fr/leaderboard",
        en: "https://www.linesia.net/en/leaderboard",
      },
    },
  };
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
