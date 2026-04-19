import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/articles";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermissionForStaff } from "@/lib/permissions";
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
  const staff = await getCurrentStaff();
  const canPreview = !!(staff && (await hasPermissionForStaff(staff, "articles.manage")));
  const article = await getArticleById(id, { includeDrafts: canPreview });
  if (!article) return {};

  const url = `${SITE}/${locale}/news/${id}`;
  const img = article.image || "/images/1024.jpg";
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
      images: [{ url: img }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [img],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const staff = await getCurrentStaff();
  const canPreview = !!(staff && (await hasPermissionForStaff(staff, "articles.manage")));
  const article = await getArticleById(id, { includeDrafts: canPreview });

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
    image: [`${SITE}${article.image || "/images/1024.jpg"}`],
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
