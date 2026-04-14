"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Newspaper, X, Save, Upload, Check } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { ARTICLE_IMAGE_PRESETS, DEFAULT_ARTICLE_IMAGE } from "@/lib/articles";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  locale: "fr" | "en";
  image: string;
}

export default function AdminPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();

  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      articles: { fr: "Articles", en: "Articles" },
      addArticle: { fr: "Nouvel article", en: "New article" },
      editArticle: { fr: "Modifier", en: "Edit" },
      noArticles: { fr: "Aucun article", en: "No articles" },
      titleField: { fr: "Titre", en: "Title" },
      excerptField: { fr: "Resume", en: "Excerpt" },
      contentField: { fr: "Contenu", en: "Content" },
      dateField: { fr: "Date", en: "Date" },
      imageField: { fr: "Image", en: "Image" },
      imageHint: { fr: "Choisis une image ou televerse la tienne. Le logo Linesia est utilise par defaut.", en: "Pick an image or upload your own. The Linesia logo is used by default." },
      uploadImage: { fr: "Televerser", en: "Upload" },
      uploading: { fr: "Envoi...", en: "Uploading..." },
      presets: { fr: "Images Linesia", en: "Linesia images" },
      save: { fr: "Enregistrer", en: "Save" },
      cancel: { fr: "Annuler", en: "Cancel" },
    };
    return labels[key]?.[locale] || labels[key]?.en || key;
  };

  const fetchArticles = useCallback(async () => {
    const res = await fetch("/api/articles");
    if (res.ok) setArticles(await res.json());
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleSave = async (data: Omit<Article, "id"> & { id?: string }) => {
    if (data.id) {
      await fetch("/api/articles", { method: "PUT", headers: headers(), body: JSON.stringify(data) });
    } else {
      await fetch("/api/articles", { method: "POST", headers: headers(), body: JSON.stringify(data) });
    }
    setEditing(null);
    setCreating(false);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "fr" ? "Supprimer cet article ?" : "Delete this article?")) return;
    await fetch(`/api/articles?id=${id}`, { method: "DELETE", headers: headers() });
    fetchArticles();
  };

  if (creating || editing) {
    return (
      <ArticleForm
        article={editing}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setCreating(false); }}
        t={t}
        headers={headers}
      />
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <Newspaper size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{t("articles")}</h1>
            <p className="text-[12px] text-text-muted">{articles.length} {t("articles").toLowerCase()}</p>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary !py-2 !px-4 !text-[13px]">
          <Plus size={15} />
          {t("addArticle")}
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="mc-card p-12 text-center">
          <Newspaper size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{t("noArticles")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((article) => (
            <div key={article.id} className="mc-card px-5 py-4 flex items-center justify-between gap-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-bg-soft shrink-0 relative">
                <Image
                  src={article.image || DEFAULT_ARTICLE_IMAGE}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-pink uppercase">{article.locale}</span>
                  <span className="text-[11px] text-text-muted">{article.date}</span>
                </div>
                <h3 className="text-[14px] font-semibold text-text truncate">{article.title}</h3>
                <p className="text-[12px] text-text-sub truncate">{article.excerpt}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing(article)}
                  className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-pink transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-text-sub hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleForm({
  article, onSave, onCancel, t, headers,
}: {
  article: Article | null;
  onSave: (data: Omit<Article, "id"> & { id?: string }) => void;
  onCancel: () => void;
  t: (key: string) => string;
  headers: () => Record<string, string>;
}) {
  const [title, setTitle] = useState(article?.title || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [content, setContent] = useState(article?.content || "");
  const [date, setDate] = useState(article?.date || new Date().toISOString().split("T")[0]);
  const [locale, setLocale] = useState<"fr" | "en">(article?.locale || "fr");
  const [image, setImage] = useState(article?.image || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveImage = image || DEFAULT_ARTICLE_IMAGE;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const h = headers();
      delete h["Content-Type"];
      const res = await fetch("/api/articles/upload", { method: "POST", headers: h, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setImage(data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) return;
    onSave({
      ...(article ? { id: article.id } : {}),
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      date,
      locale,
      image: image.trim(),
    });
  };

  return (
    <div className="max-w-[700px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text">
          {article ? t("editArticle") : t("addArticle")}
        </h1>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white text-text-sub">
          <X size={18} />
        </button>
      </div>
      <div className="mc-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">Langue</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value as "fr" | "en")} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none">
              <option value="fr">Francais</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("dateField")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("imageField")}</label>
          <p className="text-[12px] text-text-muted mb-3">{t("imageHint")}</p>

          <div className="flex items-start gap-4 mb-3">
            <div className="w-32 h-20 rounded-lg overflow-hidden bg-bg-soft border-2 border-border relative shrink-0">
              <Image src={effectiveImage} alt="" fill sizes="128px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-ghost !py-1.5 !px-3 !text-[12px]"
                >
                  <Upload size={12} />
                  {uploading ? t("uploading") : t("uploadImage")}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="btn-ghost !py-1.5 !px-3 !text-[12px]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/..."
                className="w-full px-3 py-2 rounded-lg border-2 border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
              />
              {uploadError && <p className="text-[12px] text-red-500">{uploadError}</p>}
            </div>
          </div>

          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">{t("presets")}</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ARTICLE_IMAGE_PRESETS.map((src) => {
              const selected = image === src || (!image && src === DEFAULT_ARTICLE_IMAGE);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImage(src)}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${selected ? "border-pink ring-2 ring-pink/30" : "border-border hover:border-pink/50"}`}
                >
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                  {selected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-pink flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("titleField")}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'article..." className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none" />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("excerptField")}</label>
          <input type="text" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Court resume..." className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none" />
        </div>
        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("contentField")}</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu complet de l'article..." rows={10} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none resize-y" />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onCancel} className="btn-ghost !py-2 !px-5 !text-[13px]">{t("cancel")}</button>
          <button onClick={handleSubmit} className="btn-primary !py-2 !px-5 !text-[13px]"><Save size={14} />{t("save")}</button>
        </div>
      </div>
    </div>
  );
}
