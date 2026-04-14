import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Support — Tickets & aide" : "Support — Tickets & help",
    description: fr
      ? "Besoin d'aide sur Linesia ? Ouvre un ticket pour un achat, remboursement, signalement ou toute autre demande concernant le serveur Minecraft Bedrock FR."
      : "Need help on Linesia? Open a ticket for purchases, refunds, reports or any other request about the Minecraft Bedrock server.",
    robots: { index: true, follow: true },
    alternates: {
      canonical: `https://www.linesia.net/${locale}/support`,
      languages: {
        fr: "https://www.linesia.net/fr/support",
        en: "https://www.linesia.net/en/support",
      },
    },
  };
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
