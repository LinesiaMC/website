import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleContent from "./ArticleContent";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="pt-28 pb-20">
        <ArticleContent article={article} />
      </div>
      <Footer />
    </main>
  );
}
