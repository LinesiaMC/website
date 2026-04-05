"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Search,
  Menu,
  X,
} from "lucide-react";

interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  icon: string;
  parentId: string | null;
  order: number;
}

interface TreeNode extends WikiPage {
  children: TreeNode[];
}

function buildTree(pages: WikiPage[]): TreeNode[] {
  const map = new Map<string | null, WikiPage[]>();
  for (const p of pages) {
    const key = p.parentId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const build = (parentId: string | null): TreeNode[] => {
    const children = map.get(parentId) || [];
    return children
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ ...p, children: build(p.id) }));
  };
  return build(null);
}

function SidebarItem({
  node,
  depth,
  activeSlug,
  onSelect,
  expandedIds,
  toggleExpand,
}: {
  node: TreeNode;
  depth: number;
  activeSlug: string;
  onSelect: (slug: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.slug === activeSlug;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.slug);
          if (hasChildren) toggleExpand(node.id);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
          isActive
            ? "bg-pink/10 text-pink"
            : "text-text-sub hover:bg-bg-soft hover:text-text"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={14} className="shrink-0" />
          ) : (
            <ChevronRight size={14} className="shrink-0" />
          )
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        {node.icon && <span className="shrink-0">{node.icon}</span>}
        <span className="truncate">{node.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <SidebarItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WikiContent({ pages }: { pages: WikiPage[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tree = useMemo(() => buildTree(pages), [pages]);

  const slugParam = searchParams.get("p") || "";
  const activePage = pages.find((p) => p.slug === slugParam) || pages.find((p) => p.parentId === null) || pages[0];
  const activeSlug = activePage?.slug || "";

  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Expand parent chain of active page
    const ids = new Set<string>();
    if (activePage) {
      let current: WikiPage | undefined = activePage;
      while (current?.parentId) {
        ids.add(current.parentId);
        current = pages.find((p) => p.id === current!.parentId);
      }
    }
    // Also expand all root categories
    pages.filter((p) => p.parentId === null).forEach((p) => ids.add(p.id));
    return ids;
  });

  useEffect(() => {
    // Update expanded when active page changes
    if (activePage) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let current: WikiPage | undefined = activePage;
        while (current?.parentId) {
          next.add(current.parentId);
          current = pages.find((p) => p.id === current!.parentId);
        }
        return next;
      });
    }
  }, [activePage, pages]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (slug: string) => {
    router.push(`${pathname}?p=${slug}`, { scroll: false });
    setMobileOpen(false);
  };

  const filteredPages = search.trim()
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Breadcrumb
  const breadcrumb: WikiPage[] = [];
  if (activePage) {
    let current: WikiPage | undefined = activePage;
    while (current) {
      breadcrumb.unshift(current);
      current = current.parentId ? pages.find((p) => p.id === current!.parentId) : undefined;
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-bg-soft text-[13px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
        </div>
        {search.trim() && (
          <div className="mt-2 max-h-60 overflow-auto space-y-0.5">
            {filteredPages.length === 0 ? (
              <p className="text-[12px] text-text-muted px-3 py-2">Aucun resultat</p>
            ) : (
              filteredPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleSelect(p.slug);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-text-sub hover:bg-bg-soft hover:text-text transition-colors"
                >
                  {p.icon && <span className="mr-1.5">{p.icon}</span>}
                  {p.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-auto p-2 space-y-0.5">
        {tree.map((node) => (
          <SidebarItem
            key={node.id}
            node={node}
            depth={0}
            activeSlug={activeSlug}
            onSelect={handleSelect}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="section-badge">
          <BookOpen size={14} /> Wiki
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          Wiki <span className="gradient-text">Linesia</span>
        </h1>
        <p className="text-[14px] text-text-sub mt-2">
          Toutes les informations sur le serveur
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="mc-card p-12 text-center">
          <BookOpen size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">Le wiki est en cours de construction.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="fixed bottom-6 right-6 z-40 lg:hidden w-12 h-12 rounded-full bg-pink text-white shadow-lg flex items-center justify-center"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-30 lg:hidden">
              <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-border shadow-xl overflow-auto">
                {sidebar}
              </div>
            </div>
          )}

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-[280px] shrink-0 self-start sticky top-28">
            <div className="mc-card max-h-[calc(100vh-140px)] overflow-auto flex flex-col">
              {sidebar}
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            {breadcrumb.length > 1 && (
              <div className="flex items-center gap-1.5 mb-4 text-[12px] text-text-muted flex-wrap">
                {breadcrumb.map((crumb, i) => (
                  <span key={crumb.id} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={10} />}
                    <button
                      onClick={() => handleSelect(crumb.slug)}
                      className={`hover:text-pink transition-colors ${
                        i === breadcrumb.length - 1 ? "text-text font-medium" : ""
                      }`}
                    >
                      {crumb.icon && <span className="mr-1">{crumb.icon}</span>}
                      {crumb.title}
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mc-card p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {activePage?.icon && <span className="mr-2">{activePage.icon}</span>}
                {activePage?.title}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-pink to-violet rounded-full mb-6" />

              {/* Markdown content */}
              <div className="wiki-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activePage?.content || ""}
                </ReactMarkdown>
              </div>

              {/* Sub-pages links */}
              {activePage && (() => {
                const children = pages
                  .filter((p) => p.parentId === activePage.id)
                  .sort((a, b) => a.order - b.order);
                if (children.length === 0) return null;
                return (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-[14px] font-semibold text-text mb-3">Pages dans cette section</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleSelect(child.slug)}
                          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border hover:border-pink/30 hover:bg-pink-soft/30 text-left transition-all group"
                        >
                          <span className="text-lg">{child.icon || "📄"}</span>
                          <span className="text-[13px] font-medium text-text-sub group-hover:text-pink transition-colors">
                            {child.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
