"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, Heart, Plus, Search, Pin, Lock, Flame,
  Clock, Sparkles, Shield, AlertTriangle, X, Trash2, ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RichText from "@/components/community/RichText";
import { timeAgo, compact } from "@/components/community/utils";

interface CategoryInfo {
  id: string;
  fr: string; en: string;
  emoji: string; color: string;
  desc: { fr: string; en: string };
  stats: { threads: number; posts: number };
}

interface Viewer {
  accountId: string;
  displayName: string;
  linked: boolean;
  playerUuid: string | null;
  banned: boolean;
  banReason: string | null;
  banExpiresAt: number | null;
}

interface Thread {
  id: string;
  category: string;
  authorAccountId: string;
  authorName: string;
  authorUuid: string | null;
  title: string;
  body: string;
  createdAt: number;
  lastPostAt: number;
  postCount: number;
  likeCount: number;
  pinned: boolean;
  locked: boolean;
  deleted: boolean;
  liked?: boolean;
}

type Sort = "recent" | "top" | "new";

const L = (fr: string, en: string, loc: string) => (loc === "fr" ? fr : en);

export default function CommunityPage() {
  const { locale } = useParams<{ locale: string }>();
  const loc = locale || "fr";

  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [staffCaps, setStaffCaps] = useState<{ moderate: boolean; ban: boolean }>({ moderate: false, ban: false });

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // Compose
  const [composeCat, setComposeCat] = useState<string>("general");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSubmitting, setComposeSubmitting] = useState(false);

  const refreshMeta = useCallback(async () => {
    const r = await fetch("/api/community/meta", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setCategories(j.categories);
    setViewer(j.viewer);
    setStaffCaps(j.staff || { moderate: false, ban: false });
  }, []);

  const refreshThreads = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (selectedCat) qs.set("category", selectedCat);
    if (debouncedQuery) qs.set("q", debouncedQuery);
    qs.set("sort", sort);
    qs.set("limit", "30");
    const r = await fetch(`/api/community/threads?${qs.toString()}`, { cache: "no-store" });
    const j = await r.json();
    setThreads(j.threads || []);
    setLoading(false);
  }, [selectedCat, debouncedQuery, sort]);

  useEffect(() => { refreshMeta(); }, [refreshMeta]);
  useEffect(() => { refreshThreads(); }, [refreshThreads]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const onSubmitCompose = async () => {
    setComposeError(null);
    setComposeSubmitting(true);
    try {
      const r = await fetch("/api/community/threads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: composeCat, title: composeTitle, body: composeBody }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setComposeError(mapError(j.error, loc));
        return;
      }
      setShowCompose(false);
      setComposeTitle(""); setComposeBody("");
      refreshMeta();
      refreshThreads();
    } finally {
      setComposeSubmitting(false);
    }
  };

  const toggleLike = async (t: Thread) => {
    if (!viewer?.linked || viewer.banned) return;
    // optimistic
    setThreads((list) => list.map((x) => x.id === t.id
      ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x));
    const r = await fetch(`/api/community/threads/${t.id}/like`, { method: "POST" });
    if (!r.ok) refreshThreads();
  };

  const doDelete = async (t: Thread) => {
    if (!confirm(L("Supprimer ce fil ?", "Delete this thread?", loc))) return;
    const r = await fetch(`/api/community/threads/${t.id}`, { method: "DELETE" });
    if (r.ok) refreshThreads();
  };

  const doPin = async (t: Thread) => {
    await fetch(`/api/community/threads/${t.id}/pin`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !t.pinned }),
    });
    refreshThreads();
  };

  const doLock = async (t: Thread) => {
    await fetch(`/api/community/threads/${t.id}/lock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !t.locked }),
    });
    refreshThreads();
  };

  const catById = useMemo(() => {
    const m: Record<string, CategoryInfo> = {};
    for (const c of categories) m[c.id] = c;
    return m;
  }, [categories]);

  const canPost = !!viewer?.linked && !viewer?.banned;

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
        <div className="max-w-[1100px] mx-auto">
          {/* Hero */}
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-pink/10 flex items-center justify-center">
                  <MessageSquare size={22} className="text-pink" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text leading-none">
                    {L("Communauté", "Community", loc)}
                  </h1>
                  <p className="text-[12px] text-text-sub mt-1">
                    {L("Échange, partage et donne ton avis sur Linesia.", "Chat, share and give your feedback on Linesia.", loc)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={L("Rechercher", "Search", loc)}
                  className="pl-8 pr-3 py-2 w-[200px] text-[13px] rounded-[10px] bg-white border border-border focus:outline-none focus:border-pink"
                />
              </div>
              <button
                onClick={() => {
                  if (!viewer) { window.location.href = `/${loc}/account`; return; }
                  setShowCompose(true);
                }}
                className="btn-primary !py-2 !px-4 !text-[13px] !rounded-[10px] inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                {L("Nouveau fil", "New thread", loc)}
              </button>
            </div>
          </div>

          {/* Viewer status banner */}
          {viewer && !viewer.linked && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-amber-900">
                <p className="font-semibold">
                  {L("Compte non lié", "Account not linked", loc)}
                </p>
                <p className="mt-0.5">
                  {L(
                    "Pour publier ou commenter, lie ton pseudo Minecraft depuis ton compte.",
                    "Link your Minecraft account first to post or reply.",
                    loc,
                  )}{" "}
                  <Link href={`/${loc}/account` as never} className="underline font-semibold">
                    {L("Mon compte", "My account", loc)}
                  </Link>
                </p>
              </div>
            </div>
          )}
          {viewer?.banned && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
              <X size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-red-900">
                <p className="font-semibold">
                  {L("Tu es banni de la communauté", "You are banned from the community", loc)}
                </p>
                {viewer.banReason && <p className="mt-0.5">{viewer.banReason}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar: categories */}
            <aside className="space-y-2">
              <button
                onClick={() => setSelectedCat(null)}
                className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors border flex items-center gap-2 ${
                  selectedCat === null
                    ? "bg-pink-soft border-pink/30 text-text"
                    : "bg-white border-border text-text-sub hover:border-pink/50"
                }`}
              >
                <Sparkles size={14} className="text-pink" />
                <span className="text-[13px] font-semibold">{L("Tout", "All", loc)}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors border flex items-start gap-2.5 ${
                    selectedCat === c.id
                      ? "bg-white border-pink shadow-sm"
                      : "bg-white border-border hover:border-pink/50"
                  }`}
                  style={selectedCat === c.id ? { boxShadow: `0 0 0 2px ${c.color}15` } : undefined}
                >
                  <span className="text-lg leading-none mt-0.5">{c.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-text truncate">
                      {loc === "fr" ? c.fr : c.en}
                    </span>
                    <span className="block text-[11px] text-text-muted truncate">
                      {loc === "fr" ? c.desc.fr : c.desc.en}
                    </span>
                    <span className="block text-[10px] text-text-muted mt-0.5">
                      {c.stats.threads} {L("fils", "threads", loc)} · {c.stats.posts} {L("messages", "posts", loc)}
                    </span>
                  </span>
                </button>
              ))}

              {staffCaps.moderate && (
                <Link
                  href={`/${loc}/community/moderation` as never}
                  className="block rounded-2xl border border-border bg-white px-3 py-2.5 text-[12px] font-semibold text-text-sub hover:border-pink/50 flex items-center gap-2"
                >
                  <Shield size={13} className="text-pink" />
                  {L("Modération", "Moderation", loc)}
                </Link>
              )}
            </aside>

            {/* Thread list */}
            <section>
              {/* Sort tabs */}
              <div className="flex items-center gap-1 mb-3 bg-white rounded-[12px] border border-border p-1 w-fit">
                {(["recent", "top", "new"] as Sort[]).map((s) => {
                  const Icon = s === "recent" ? Clock : s === "top" ? Flame : Sparkles;
                  const label = s === "recent"
                    ? L("Actif", "Active", loc)
                    : s === "top" ? L("Populaire", "Popular", loc) : L("Nouveau", "Newest", loc);
                  return (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                        sort === s ? "bg-pink-soft text-pink" : "text-text-sub hover:text-text"
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="mc-card p-8 text-center">
                  <p className="text-[13px] text-text-muted">{L("Chargement…", "Loading…", loc)}</p>
                </div>
              ) : threads.length === 0 ? (
                <div className="mc-card p-10 text-center">
                  <MessageSquare size={28} className="text-pink mx-auto mb-2 opacity-60" />
                  <p className="text-[14px] font-semibold text-text">
                    {L("Aucun fil pour l'instant", "No threads yet", loc)}
                  </p>
                  <p className="text-[12px] text-text-muted mt-1">
                    {L("Sois le premier à lancer la discussion !", "Be the first to start a discussion!", loc)}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {threads.map((t) => {
                    const cat = catById[t.category];
                    const isAuthor = viewer?.accountId === t.authorAccountId;
                    const canMod = staffCaps.moderate;
                    return (
                      <li key={t.id} className="mc-card overflow-hidden">
                        <div className="flex items-stretch">
                          {/* Vote column */}
                          <button
                            onClick={() => toggleLike(t)}
                            disabled={!canPost || t.deleted}
                            title={canPost ? L("J'aime", "Like", loc) : L("Lie ton compte pour aimer", "Link your account to like", loc)}
                            className={`w-14 shrink-0 flex flex-col items-center justify-center gap-0.5 border-r border-border transition-colors ${
                              t.liked ? "bg-pink-soft" : "bg-white hover:bg-bg-soft"
                            } ${!canPost ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <Heart size={15} className={t.liked ? "fill-pink text-pink" : "text-text-muted"} />
                            <span className={`text-[11px] font-bold ${t.liked ? "text-pink" : "text-text-sub"}`}>
                              {compact(t.likeCount)}
                            </span>
                          </button>

                          {/* Body */}
                          <div className="flex-1 min-w-0 p-4">
                            <div className="flex items-start gap-2 mb-1">
                              {cat && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                                >
                                  <span>{cat.emoji}</span>
                                  <span>{loc === "fr" ? cat.fr : cat.en}</span>
                                </span>
                              )}
                              {t.pinned && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                  <Pin size={9} />{L("épinglé", "pinned", loc)}
                                </span>
                              )}
                              {t.locked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                  <Lock size={9} />{L("verrouillé", "locked", loc)}
                                </span>
                              )}
                              {t.deleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">
                                  <Trash2 size={9} />{L("supprimé", "deleted", loc)}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/${loc}/community/${t.id}` as never}
                              className="block"
                            >
                              <h3 className={`text-[15px] font-bold text-text hover:text-pink transition-colors ${t.deleted ? "line-through opacity-60" : ""}`}>
                                {t.title}
                              </h3>
                              {!t.deleted && (
                                <div className="text-[12px] text-text-sub mt-1 line-clamp-2">
                                  <RichText>{t.body}</RichText>
                                </div>
                              )}
                            </Link>

                            <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                <span className="font-semibold text-text-sub truncate max-w-[140px]">{t.authorName}</span>
                                <span>·</span>
                                <span>{timeAgo(t.createdAt, loc)}</span>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare size={11} />
                                  {compact(t.postCount)} {L("rép.", "replies", loc)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {canMod && !t.deleted && (
                                  <>
                                    <button
                                      onClick={() => doPin(t)}
                                      className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50"
                                      title={L("Épingler", "Pin", loc)}
                                    >
                                      <Pin size={13} />
                                    </button>
                                    <button
                                      onClick={() => doLock(t)}
                                      className="p-1.5 rounded-lg text-text-muted hover:text-slate-700 hover:bg-slate-100"
                                      title={L("Verrouiller", "Lock", loc)}
                                    >
                                      <Lock size={13} />
                                    </button>
                                  </>
                                )}
                                {(canMod || isAuthor) && !t.deleted && (
                                  <button
                                    onClick={() => doDelete(t)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50"
                                    title={L("Supprimer", "Delete", loc)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCompose(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-[15px] font-bold text-text inline-flex items-center gap-2">
                <Plus size={16} className="text-pink" />
                {L("Nouveau fil", "New thread", loc)}
              </h2>
              <button onClick={() => setShowCompose(false)} className="text-text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>

            {!canPost ? (
              <div className="p-6 text-center">
                <p className="text-[13px] text-text-sub mb-4">
                  {viewer?.banned
                    ? L("Tu ne peux pas poster : compte banni.", "You cannot post: account banned.", loc)
                    : L("Ton compte Minecraft doit être lié pour poster.", "Your Minecraft account must be linked to post.", loc)}
                </p>
                <Link href={`/${loc}/account` as never} className="btn-primary !text-[13px] !py-2 !px-4 !rounded-[10px]">
                  {L("Gérer mon compte", "Manage account", loc)}
                </Link>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    {L("Catégorie", "Category", loc)}
                  </label>
                  <div className="relative">
                    <select
                      value={composeCat}
                      onChange={(e) => setComposeCat(e.target.value)}
                      className="w-full appearance-none bg-white border border-border rounded-[10px] py-2.5 px-3 pr-9 text-[13px] focus:outline-none focus:border-pink"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {loc === "fr" ? c.fr : c.en}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    {catById[composeCat] && (loc === "fr" ? catById[composeCat].desc.fr : catById[composeCat].desc.en)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    {L("Titre", "Title", loc)}
                    <span className="font-normal text-text-muted ml-1">
                      ({composeTitle.length}/120)
                    </span>
                  </label>
                  <input
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value.slice(0, 120))}
                    maxLength={120}
                    placeholder={L("Un titre court et clair", "A short, clear title", loc)}
                    className="w-full bg-white border border-border rounded-[10px] py-2.5 px-3 text-[13px] focus:outline-none focus:border-pink"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    {L("Message", "Message", loc)}
                    <span className="font-normal text-text-muted ml-1">
                      ({composeBody.length}/8000)
                    </span>
                  </label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value.slice(0, 8000))}
                    maxLength={8000}
                    rows={8}
                    placeholder={L("Décris ton idée, bug, pack, vidéo…", "Describe your idea, bug, pack, video…", loc)}
                    className="w-full bg-white border border-border rounded-[10px] py-2.5 px-3 text-[13px] focus:outline-none focus:border-pink resize-y"
                  />
                </div>

                {composeError && (
                  <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2">
                    {composeError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCompose(false)}
                    className="px-4 py-2 rounded-[10px] border border-border text-[13px] font-medium text-text-sub hover:text-text"
                  >
                    {L("Annuler", "Cancel", loc)}
                  </button>
                  <button
                    onClick={onSubmitCompose}
                    disabled={composeSubmitting || composeTitle.trim().length < 4 || composeBody.trim().length < 4}
                    className="btn-primary !text-[13px] !py-2 !px-4 !rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {composeSubmitting ? L("Envoi…", "Posting…", loc) : L("Publier", "Publish", loc)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

function mapError(code: string | undefined, loc: string): string {
  switch (code) {
    case "rate_limited": return L("Trop rapide, attends quelques minutes.", "Too fast, wait a few minutes.", loc);
    case "banned": return L("Tu es banni de la communauté.", "You are banned from the community.", loc);
    case "not_linked": return L("Compte non lié.", "Account not linked.", loc);
    case "title_too_short": return L("Titre trop court.", "Title too short.", loc);
    case "body_too_short": return L("Message trop court.", "Message too short.", loc);
    case "invalid_category": return L("Catégorie invalide.", "Invalid category.", loc);
    case "thread_locked": return L("Fil verrouillé.", "Thread locked.", loc);
    default: return L("Erreur, réessaye.", "Error, try again.", loc);
  }
}
