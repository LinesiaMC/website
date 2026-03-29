# Linesia - Minecraft Server Website

The official website for **Linesia**, a Minecraft PvP Faction server.

## Design

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#FFFFFF` | Page background |
| Background Soft | `#F5F5F7` | Alternating section background |
| Pink | `#E91E8C` | Primary accent, CTAs, highlights |
| Pink Light | `#F472B6` | Hover states |
| Pink Soft | `#FDF2F8` | Icon backgrounds, subtle fills |
| Violet | `#7C3AED` | Secondary accent, gradient endpoint |
| Violet Light | `#A78BFA` | Hover states |
| Violet Soft | `#F5F3FF` | Icon backgrounds, subtle fills |
| Text | `#202020` | Primary text |
| Text Secondary | `#6B7280` | Secondary text |
| Text Muted | `#9CA3AF` | Muted labels |
| Border | `#E5E7EB` | Card borders, dividers |
| Discord | `#5865F2` | Discord accent |

### Gradients
- **Primary CTA** (btn-play): `linear-gradient(135deg, #E91E8C, #7C3AED)`
- **Gradient text**: `linear-gradient(135deg, #E91E8C, #7C3AED)`
- **Progress bar**: `linear-gradient(90deg, #E91E8C, #7C3AED)`

## Tech Stack

- **Next.js 15** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **Framer Motion** - Animations
- **next-intl** - Internationalization (FR/EN)
- **Lucide React** - Icon library

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Features

- Responsive design (mobile-first)
- Multi-language support (French & English)
- Animated hero with live player count
- Server IP copy functionality
- Store with monthly goals and Tebex integration
- FAQ accordion
- Floating white navbar (Hyping-style)
- Scroll-triggered animations

## Project Structure

```
src/
  app/[locale]/       # Pages (locale-based routing)
  components/         # Reusable UI components
  messages/           # Translation files (fr.json, en.json)
  i18n/               # Internationalization config
```

## Deployment

Deploy on [Vercel](https://vercel.com) for best Next.js support:

```bash
npm run build
```

## Links

- Server: `play.linesia.net`
- Discord: [discord.gg/linesia](https://discord.gg/linesia)
- Store: [linesia.tebex.io](https://linesia.tebex.io)
- Support: support@linesia.net
