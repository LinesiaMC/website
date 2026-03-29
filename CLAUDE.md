# Linesia - Minecraft Server Website

## Tech Stack
- **Next.js 15** (App Router), TypeScript, Tailwind CSS v4, Framer Motion, next-intl

## Structure
```
src/
  app/[locale]/          # Pages (locale routing: /fr, /en)
    page.tsx             # Homepage
    store/page.tsx       # Store page (all 6 gem packs)
    news/page.tsx        # News list
    news/[id]/page.tsx   # Article detail page
    news/NewsContent.tsx # Client component for news list
    admin/page.tsx       # Admin panel (password-protected)
    layout.tsx           # Root layout with i18n + hreflang SEO
  app/api/articles/      # REST API for articles CRUD
  components/            # Navbar, Hero, Features, ServerJoin, RecentNews, Store, FAQ, Footer
  messages/fr.json       # French translations
  messages/en.json       # English translations
  i18n/routing.ts        # Locale routing config (fr default, en)
  i18n/request.ts        # Server-side i18n
  lib/
    articles.ts          # Article CRUD (file-based JSON storage)
    store-config.ts      # Gem packs + Tebex config
    admin-config.ts      # Admin password (env: ADMIN_PASSWORD)
    useReveal.tsx         # Scroll-reveal hook + RevealDiv component
middleware.ts            # next-intl locale middleware
data/articles.json       # Article storage (gitignored)
```

## Design
- **White theme** inspired by playhyping.com / evolucraft.fr
- **Colors**: White bg (#FFF), Soft gray (#F1F4F8), Pink (#E91E8C) accent, Violet (#7C3AED) secondary
- **Cards**: `.mc-card` = white bg, border, pink top bar on hover, subtle shadow
- **Font**: Poppins (Google Fonts)
- **Animations**: Scroll-reveal (IntersectionObserver), staggered delays

## Homepage flow (top to bottom)
1. Hero (title, CTAs, stats)
2. Features (6 cards)
3. Server Join (platform tabs: Java, Bedrock, Console with LinesiaJoin bot)
4. Recent News (3 latest articles)
5. Store preview (3 gem packs)
6. FAQ
7. Footer

## Key configs
- **Tebex**: Edit `src/lib/store-config.ts` to set `tebexPackageId` per gem pack
- **Admin password**: Set `ADMIN_PASSWORD` env var (default: `linesia-admin-2026`)
- **Articles**: Stored in `data/articles.json`, managed via `/fr/admin`

## Commands
- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
