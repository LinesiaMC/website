import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Parrainage — Invite tes amis et gagne des récompenses" : "Referral — Invite friends, earn rewards",
    description: fr
      ? "Parraine tes amis sur Linesia et gagne des gemmes et récompenses exclusives sur le serveur Minecraft Bedrock FR."
      : "Refer friends to Linesia and earn gems and exclusive rewards on the Minecraft Bedrock server.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/parrainage`,
      languages: {
        fr: "https://www.linesia.net/fr/parrainage",
        en: "https://www.linesia.net/en/parrainage",
      },
    },
  };
}

export default function ParrainageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
