"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Eye,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Tree item in sidebar ---
function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (page: WikiPage) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === selectedId;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node);
          if (hasChildren) toggleExpand(node.id);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
          isActive
            ? "bg-pink/10 text-pink"
            : "text-text-sub hover:bg-bg-soft hover:text-text"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={12} className="shrink-0" />
          ) : (
            <ChevronRight size={12} className="shrink-0" />
          )
        ) : (
          <span className="w-[12px] shrink-0" />
        )}
        {node.icon && <span className="shrink-0 text-[11px]">{node.icon}</span>}
        <span className="truncate">{node.title}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
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

export default function AdminWikiPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();

  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selected, setSelected] = useState<WikiPage | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(0);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(pages), [pages]);

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      wiki: { fr: "Wiki", en: "Wiki" },
      addPage: { fr: "Nouvelle page", en: "New page" },
      addSubPage: { fr: "Sous-page", en: "Sub-page" },
      editPage: { fr: "Modifier la page", en: "Edit page" },
      createPage: { fr: "Creer une page", en: "Create page" },
      noPages: { fr: "Aucune page wiki", en: "No wiki pages" },
      title: { fr: "Titre", en: "Title" },
      slug: { fr: "Slug (URL)", en: "Slug (URL)" },
      icon: { fr: "Icone (emoji)", en: "Icon (emoji)" },
      content: { fr: "Contenu (Markdown)", en: "Content (Markdown)" },
      order: { fr: "Ordre", en: "Order" },
      save: { fr: "Enregistrer", en: "Save" },
      cancel: { fr: "Annuler", en: "Cancel" },
      delete: { fr: "Supprimer", en: "Delete" },
      deleteConfirm: { fr: "Supprimer cette page et ses sous-pages ?", en: "Delete this page and its sub-pages?" },
      preview: { fr: "Apercu", en: "Preview" },
      editor: { fr: "Editeur", en: "Editor" },
      selectPage: { fr: "Selectionnez une page ou creez-en une", en: "Select a page or create one" },
      moveUp: { fr: "Monter", en: "Move up" },
      moveDown: { fr: "Descendre", en: "Move down" },
    };
    return labels[key]?.[locale] || labels[key]?.en || key;
  };

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/wiki");
    if (res.ok) {
      const data = await res.json();
      setPages(data);
      // Expand all root nodes by default
      setExpandedIds((prev) => {
        const next = new Set(prev);
        data.filter((p: WikiPage) => p.parentId === null).forEach((p: WikiPage) => next.add(p.id));
        return next;
      });
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = (parentId: string | null) => {
    const siblings = pages.filter((p) => p.parentId === parentId);
    setCreateParentId(parentId);
    setCreating(true);
    setEditing(false);
    setTitle("");
    setSlug("");
    setIcon("");
    setContent("");
    setOrder(siblings.length);
    setPreview(false);
  };

  const startEdit = (page: WikiPage) => {
    setSelected(page);
    setEditing(true);
    setCreating(false);
    setTitle(page.title);
    setSlug(page.slug);
    setIcon(page.icon);
    setContent(page.content);
    setOrder(page.order);
    setPreview(false);
  };

  const handleSelect = (page: WikiPage) => {
    if (!editing && !creating) {
      setSelected(page);
    }
  };

  const handleSave = async () => {
    const finalSlug = slug.trim() || slugify(title);
    if (!title.trim() || !finalSlug) return;

    if (creating) {
      await fetch("/api/wiki", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: title.trim(),
          slug: finalSlug,
          icon: icon.trim(),
          content,
          parentId: createParentId,
          order,
        }),
      });
    } else if (editing && selected) {
      await fetch("/api/wiki", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          id: selected.id,
          title: title.trim(),
          slug: finalSlug,
          icon: icon.trim(),
          content,
          order,
        }),
      });
    }
    setEditing(false);
    setCreating(false);
    await fetchPages();
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/wiki?id=${selected.id}`, { method: "DELETE", headers: headers() });
    setSelected(null);
    setEditing(false);
    await fetchPages();
  };

  const handleMove = async (page: WikiPage, direction: "up" | "down") => {
    const siblings = pages
      .filter((p) => p.parentId === page.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((p) => p.id === page.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const other = siblings[swapIdx];
    await Promise.all([
      fetch("/api/wiki", { method: "PUT", headers: headers(), body: JSON.stringify({ id: page.id, order: other.order }) }),
      fetch("/api/wiki", { method: "PUT", headers: headers(), body: JSON.stringify({ id: other.id, order: page.order }) }),
    ]);
    await fetchPages();
  };

  const handleCancel = () => {
    setEditing(false);
    setCreating(false);
    setPreview(false);
  };

  const autoSlug = (val: string) => {
    setTitle(val);
    if (creating) setSlug(slugify(val));
  };

  const showForm = editing || creating;

  return (
    <div className="flex h-[calc(100vh-1px)] overflow-hidden">
      {/* Sidebar tree */}
      <div className="w-[260px] shrink-0 border-r border-border flex flex-col bg-white">
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="text-[13px] font-bold text-text">{t("wiki")}</span>
            <span className="text-[11px] text-text-muted">{pages.length}</span>
          </div>
          <button
            onClick={() => startCreate(null)}
            className="p-1.5 rounded-lg hover:bg-bg-soft text-text-sub hover:text-pink transition-colors"
            title={t("addPage")}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
          {tree.length === 0 ? (
            <p className="text-[12px] text-text-muted px-3 py-4 text-center">{t("noPages")}</p>
          ) : (
            tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {showForm ? (
          <div className="max-w-[900px] mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-bold text-text">
                {creating ? t("createPage") : t("editPage")}
              </h1>
              <button onClick={handleCancel} className="p-2 rounded-lg hover:bg-bg-soft text-text-sub">
                <X size={18} />
              </button>
            </div>

            <div className="mc-card p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("title")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => autoSlug(e.target.value)}
                    placeholder="Titre de la page..."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("icon")}</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="📄"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("slug")}</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="mon-slug-url"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("order")}</label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none"
                  />
                </div>
              </div>

              {/* Content editor with preview toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-semibold text-text-sub uppercase tracking-wider">{t("content")}</label>
                  <button
                    onClick={() => setPreview(!preview)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-text-sub hover:text-pink transition-colors"
                  >
                    {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                    {preview ? t("editor") : t("preview")}
                  </button>
                </div>
                {preview ? (
                  <Markdown className="w-full min-h-[400px] p-4 rounded-xl border-2 border-border bg-white wiki-content">
                    {content}
                  </Markdown>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Contenu en Markdown..."
                    rows={20}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none resize-y font-mono"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {editing && selected && (
                    <button onClick={handleDelete} className="text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5">
                      <Trash2 size={14} />
                      {t("delete")}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCancel} className="btn-ghost !py-2 !px-5 !text-[13px]">{t("cancel")}</button>
                  <button onClick={handleSave} className="btn-primary !py-2 !px-5 !text-[13px]"><Save size={14} />{t("save")}</button>
                </div>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="max-w-[900px] mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-lg font-bold text-text flex items-center gap-2">
                  {selected.icon && <span>{selected.icon}</span>}
                  {selected.title}
                </h1>
                <p className="text-[12px] text-text-muted font-mono mt-0.5">/{selected.slug}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMove(selected, "up")}
                  className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-text transition-colors"
                  title={t("moveUp")}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  onClick={() => handleMove(selected, "down")}
                  className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-text transition-colors"
                  title={t("moveDown")}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  onClick={() => startCreate(selected.id)}
                  className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-pink transition-colors"
                  title={t("addSubPage")}
                >
                  <FolderPlus size={15} />
                </button>
                <button
                  onClick={() => startEdit(selected)}
                  className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-pink transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg hover:bg-red-50 text-text-sub hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mc-card p-6">
              <Markdown>{selected.content}</Markdown>
              {selected.content.trim() === "" && (
                <p className="text-[13px] text-text-muted italic">Page vide — cliquez sur le crayon pour ajouter du contenu.</p>
              )}
            </div>

            {/* Children */}
            {(() => {
              const children = pages
                .filter((p) => p.parentId === selected.id)
                .sort((a, b) => a.order - b.order);
              if (children.length === 0) return null;
              return (
                <div className="mt-4">
                  <h3 className="text-[13px] font-semibold text-text-sub mb-2">Sous-pages ({children.length})</h3>
                  <div className="space-y-1">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelected(child);
                          setExpandedIds((prev) => new Set([...prev, selected.id]));
                        }}
                        className="w-full mc-card px-4 py-3 flex items-center gap-2.5 text-left hover:border-pink/30"
                      >
                        <span>{child.icon || "📄"}</span>
                        <span className="text-[13px] font-medium text-text-sub">{child.title}</span>
                        <span className="text-[11px] text-text-muted font-mono ml-auto">/{child.slug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-[14px] text-text-sub">{t("selectPage")}</p>
              <button
                onClick={() => startCreate(null)}
                className="btn-primary !py-2 !px-4 !text-[13px] mt-4"
              >
                <Plus size={14} />
                {t("addPage")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
