import fs from "fs";
import path from "path";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const WIKI_FILE = path.join(DATA_DIR, "wiki.json");

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  icon: string;
  parentId: string | null;
  order: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(WIKI_FILE)) {
    fs.writeFileSync(WIKI_FILE, JSON.stringify([], null, 2));
  }
}

export function getWikiPages(): WikiPage[] {
  ensureDataDir();
  const raw = fs.readFileSync(WIKI_FILE, "utf-8");
  return JSON.parse(raw);
}

export function getWikiPageBySlug(slug: string): WikiPage | undefined {
  return getWikiPages().find((p) => p.slug === slug);
}

export function getWikiPageById(id: string): WikiPage | undefined {
  return getWikiPages().find((p) => p.id === id);
}

export function getWikiChildren(parentId: string | null): WikiPage[] {
  return getWikiPages()
    .filter((p) => p.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function createWikiPage(page: Omit<WikiPage, "id">): WikiPage {
  ensureDataDir();
  const pages = getWikiPages();
  const newPage: WikiPage = {
    ...page,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };
  pages.push(newPage);
  fs.writeFileSync(WIKI_FILE, JSON.stringify(pages, null, 2));
  return newPage;
}

export function updateWikiPage(id: string, data: Partial<Omit<WikiPage, "id">>): WikiPage | null {
  ensureDataDir();
  const pages = getWikiPages();
  const idx = pages.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  pages[idx] = { ...pages[idx], ...data };
  fs.writeFileSync(WIKI_FILE, JSON.stringify(pages, null, 2));
  return pages[idx];
}

export function deleteWikiPage(id: string): boolean {
  ensureDataDir();
  const pages = getWikiPages();
  // Delete page and all its children recursively
  const toDelete = new Set<string>();
  const collect = (parentId: string) => {
    toDelete.add(parentId);
    pages.filter((p) => p.parentId === parentId).forEach((p) => collect(p.id));
  };
  collect(id);
  const filtered = pages.filter((p) => !toDelete.has(p.id));
  if (filtered.length === pages.length) return false;
  fs.writeFileSync(WIKI_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

export function setWikiPages(pages: WikiPage[]): void {
  ensureDataDir();
  fs.writeFileSync(WIKI_FILE, JSON.stringify(pages, null, 2));
}
