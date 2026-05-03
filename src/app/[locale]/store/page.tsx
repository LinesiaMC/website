import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Store from "@/components/Store";
import Footer from "@/components/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fr = locale !== "en";
  return {
    title: fr ? "Boutique — Gemmes & grades" : "Store — Gems & ranks",
    description: fr
      ? "Boutique Linesia : achète des gemmes, grades VIP et cosmétiques pour soutenir le serveur Minecraft Bedrock FR et débloquer du contenu exclusif."
      : "Linesia store: buy gems, VIP ranks and cosmetics to support the Minecraft Bedrock server and unlock exclusive content.",
    alternates: {
      canonical: `https://www.linesia.net/${locale}/store`,
      languages: {
        fr: "https://www.linesia.net/fr/store",
        en: "https://www.linesia.net/en/store",
      },
    },
  };
}

export default function StorePage() {
  return (
    <main>
      <Navbar />
      <Store />
      <Footer />
    </main>
  );
}
