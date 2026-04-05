import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return {
    title: "Linesia - Serveur Minecraft PvP Faction",
    description: t("subtitle"),
    alternates: {
      canonical: `https://www.linesia.net/${locale}`,
      languages: {
        fr: "https://www.linesia.net/fr",
        en: "https://www.linesia.net/en",
      },
    },
    openGraph: {
      title: "Linesia - Serveur Minecraft PvP Faction",
      description: t("subtitle"),
      type: "website",
      url: `https://www.linesia.net/${locale}`,
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "fr" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link rel="alternate" hrefLang="fr" href="https://www.linesia.net/fr" />
        <link rel="alternate" hrefLang="en" href="https://www.linesia.net/en" />
        <link rel="alternate" hrefLang="x-default" href="https://www.linesia.net/fr" />
      </head>
      <body className="bg-white text-text antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
