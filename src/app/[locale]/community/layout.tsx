import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Communauté Linesia — Forum & discussions" : "Linesia Community — Forum & discussions",
    description: fr
      ? "Rejoins la communauté Linesia : discussions, entraide, suggestions et astuces pour le serveur Minecraft Bedrock FR (SkyFaction, KitFFA, PvP)."
      : "Join the Linesia community: discussions, help, suggestions and tips for the Minecraft Bedrock server (SkyFaction, KitFFA, PvP).",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/community`,
      languages: {
        fr: "https://www.linesia.net/fr/community",
        en: "https://www.linesia.net/en/community",
      },
    },
  };
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
