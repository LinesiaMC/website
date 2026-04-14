import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

const SITE_URL = "https://www.linesia.net";

const COPY = {
  fr: {
    title: "Linesia — Serveur Minecraft Bedrock FR : SkyFaction, KitFFA, PvP",
    titleTemplate: "%s · Linesia",
    description:
      "Linesia, le serveur Minecraft Bedrock FR n°1 : SkyFaction, KitFFA, Kitmap, PvP Faction et modes temporaires. Jouable sur PC, mobile et console. Rejoins la communauté FR !",
    ogLocale: "fr_FR",
  },
  en: {
    title: "Linesia — Minecraft Bedrock Server: SkyFaction, KitFFA, PvP Faction",
    titleTemplate: "%s · Linesia",
    description:
      "Linesia, the unique Minecraft Bedrock server: SkyFaction, KitFFA, Kitmap, PvP Faction and limited-time modes. Play on PC, mobile and console. Join the community!",
    ogLocale: "en_US",
  },
} as const;

const KEYWORDS = [
  "Linesia",
  "serveur Minecraft Bedrock",
  "Minecraft Bedrock FR",
  "serveur Minecraft Bedrock FR",
  "Minecraft Bedrock",
  "PvP Faction",
  "PvP Faction Bedrock",
  "SkyFaction",
  "SkyBlock",
  "Kitmap",
  "KitFFA",
  "KitPvP",
  "serveur minecraft PE",
  "Minecraft mobile",
  "Minecraft console",
  "serveur Bedrock français",
  "faction Bedrock",
  "Minecraft Xbox",
  "Minecraft PS4",
  "Minecraft Switch",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = (locale === "en" ? "en" : "fr") as "fr" | "en";
  const copy = COPY[l];

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: copy.title, template: copy.titleTemplate },
    description: copy.description,
    applicationName: "Linesia",
    keywords: KEYWORDS,
    category: "games",
    authors: [{ name: "Linesia", url: SITE_URL }],
    creator: "Linesia",
    publisher: "Linesia",
    alternates: {
      canonical: `${SITE_URL}/${l}`,
      languages: {
        fr: `${SITE_URL}/fr`,
        en: `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/fr`,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "website",
      url: `${SITE_URL}/${l}`,
      siteName: "Linesia",
      locale: copy.ogLocale,
      images: [
        {
          url: "/images/1024.jpg",
          width: 1024,
          height: 1024,
          alt: "Linesia — Serveur Minecraft Bedrock",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/images/1024.jpg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Linesia",
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false, email: false, address: false },
    other: {
      "msapplication-TileColor": "#ec4899",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ec4899",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

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

  setRequestLocale(locale);

  const messages = await getMessages();

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Linesia",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [
      "https://discord.gg/linesia",
      "https://www.tiktok.com/@linesia",
      "https://www.youtube.com/@linesia",
    ],
  };

  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Linesia",
    url: SITE_URL,
    inLanguage: locale === "en" ? "en" : "fr",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/${locale}/wiki?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const gameLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Linesia — Serveur Minecraft Bedrock",
    url: `${SITE_URL}/${locale}`,
    image: `${SITE_URL}/images/1024.jpg`,
    description:
      locale === "en"
        ? "Minecraft Bedrock server featuring SkyFaction, KitFFA, Kitmap and PvP Faction."
        : "Serveur Minecraft Bedrock FR proposant SkyFaction, KitFFA, Kitmap et PvP Faction.",
    gamePlatform: ["PC", "Mobile", "Xbox", "PlayStation", "Nintendo Switch"],
    applicationCategory: "Game",
    genre: ["PvP", "Faction", "SkyBlock", "KitPvP"],
    operatingSystem: "Windows, Android, iOS, Xbox, PlayStation, Nintendo Switch",
    publisher: { "@type": "Organization", name: "Linesia" },
  };

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link rel="alternate" hrefLang="fr" href={`${SITE_URL}/fr`} />
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/fr`} />
        <link rel="preconnect" href="https://cdn.discordapp.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gameLd) }}
        />
      </head>
      <body className="bg-white text-text antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
