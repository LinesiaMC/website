export const dynamic = "force-dynamic";

import { getArticlesByLocale } from "@/lib/articles";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Showcase from "@/components/Showcase";
import ServerJoin from "@/components/ServerJoin";
import RecentNews from "@/components/RecentNews";
import StoreTeaser from "@/components/StoreTeaser";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const articles = await getArticlesByLocale(locale);

  return (
    <main>
      <Navbar />
      <Hero />
      <Showcase />
      <Features />
      <ServerJoin />
      <RecentNews articles={articles} />
      <StoreTeaser />
      <FAQ />
      <Footer />
    </main>
  );
}
