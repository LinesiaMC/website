# Linesia - Minecraft Server Website

## Tech Stack
- **Next.js 15** (App Router), TypeScript, Tailwind CSS v4, Framer Motion, next-intl
- **Chart.js + react-chartjs-2** for analytics charts

## Structure
```
src/
  app/[locale]/          # Pages (locale routing: /fr, /en)
    page.tsx             # Homepage
    store/page.tsx       # Store page (all 6 gem packs)
    news/page.tsx        # News list
    news/[id]/page.tsx   # Article detail page
    news/NewsContent.tsx # Client component for news list
    admin/page.tsx       # Admin panel - Articles management
    admin/analytics/
      page.tsx           # Analytics dashboard (KPIs, charts)
      players/page.tsx   # Players list with search/sort
      players/[uuid]/    # Player detail (sessions, commands, worlds, deaths, messages)
      retention/page.tsx # Retention cohort analysis
      worlds/page.tsx    # World analytics
      logs/page.tsx      # Logs search & filtering
      messages/page.tsx  # Chat logs (public, private, faction, staff)
      items/trace/page.tsx # Item tracing by unique ID (UID)
    layout.tsx           # Root layout with i18n + hreflang SEO
  app/api/
    articles/            # REST API for articles CRUD
    analytics/[...path]/ # Proxy API to web-panel analytics backend
  components/
    Navbar, Hero, Features, ServerJoin, RecentNews, Store, FAQ, Footer
    admin/
      AdminShell.tsx     # Shared admin layout (sidebar nav + auth)
      AnalyticsAPI.tsx   # Analytics API helpers (fetcher, formatters)
  messages/fr.json       # French translations
  messages/en.json       # English translations
  i18n/routing.ts        # Locale routing config (fr default, en)
  i18n/request.ts        # Server-side i18n
  lib/
    articles.ts          # Article CRUD (file-based JSON storage)
    store-config.ts      # Gem packs + Tebex config
    admin-config.ts      # Admin password (env: ADMIN_PASSWORD)
    analytics-config.ts  # Analytics API URL + key config
    useReveal.tsx        # Scroll-reveal hook + RevealDiv component
middleware.ts            # next-intl locale middleware
data/articles.json       # Article storage (gitignored)
vercel.json              # Vercel deployment config
```

## Design
- **White theme** with violet accents, inspired by playhyping.com / evolucraft.fr
- **Color palette** (violet-based):
  - `#2B0036` violet tres sombre, `#4A0A63` violet profond, `#6A1B9A` violet soutenu (hover)
  - `#8E2DE2` **violet vif (primary accent)**, `#B84DFF` violet clair (secondary)
  - `#D47CFF` violet pastel, `#F2A6FF` rose-violet clair
  - Soft bg: `#F3EAFF`, White bg: `#FFF`, Soft gray: `#F1F4F8`
- **Cards**: `.mc-card` = white bg, border, violet gradient top bar on hover, subtle shadow
- **Logo**: `public/images/1024.jpg` (purple 3D "L"), **Banner**: `public/images/1024_title.png`
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

## Admin Panel
- Sidebar navigation: Articles, Dashboard, Players, Retention, Worlds, Economy, Items, Trace Item, Messages, Casino, Boxes, Logs
- Password-protected (same auth for all pages)
- Analytics pages fetch data from web-panel via `/api/analytics/` proxy

## Key configs
- **Tebex**: Edit `src/lib/store-config.ts` to set `tebexPackageId` per gem pack
- **Admin password**: Set `ADMIN_PASSWORD` env var (default: `linesia-admin-2026`)
- **Articles**: Stored in `data/articles.json`, managed via `/fr/admin`
- **Analytics API**: Set `ANALYTICS_API_URL` env var (default: `http://localhost:3000`)
- **Analytics API Key**: Set `ANALYTICS_API_KEY` env var (default: `mcpe-analytics-secret-key-change-me`)

## Deployment (Vercel)
- Website: Deploy from `website/` directory, framework auto-detected as Next.js
- Web-panel: Deploy from `web-panel/` directory, uses `vercel.json` for Express serverless
- Set env vars: `ADMIN_PASSWORD`, `ANALYTICS_API_URL` (point to web-panel URL), `ANALYTICS_API_KEY`

## Commands
- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
