import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArticleContent from "./ArticleContent";

const SITE = "https://www.linesia.net";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const article = await getArticleById(id);
  if (!article) return {};

  const url = `${SITE}/${locale}/news/${id}`;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url,
      publishedTime: article.date,
      siteName: "Linesia",
      images: [{ url: "/images/1024.jpg", width: 1024, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: ["/images/1024.jpg"],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: article.locale,
    image: [`${SITE}/images/1024.jpg`],
    mainEntityOfPage: `${SITE}/${locale}/news/${id}`,
    author: { "@type": "Organization", name: "Linesia" },
    publisher: {
      "@type": "Organization",
      name: "Linesia",
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
  };

  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <Navbar />
      <div className="pt-28 pb-20">
        <ArticleContent article={article} />
      </div>
      <Footer />
    </main>
  );
}
