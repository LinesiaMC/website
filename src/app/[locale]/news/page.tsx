export const dynamic = "force-dynamic";

import { getArticlesByLocale } from "@/lib/articles";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsContent from "./NewsContent";

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
