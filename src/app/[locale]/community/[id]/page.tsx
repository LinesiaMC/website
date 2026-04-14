"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Heart, Send, MessageSquare, Pin, Lock, Flag,
  Trash2, X, AlertTriangle, Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RichText from "@/components/community/RichText";
import { timeAgo, compact } from "@/components/community/utils";

interface Thread {
  id: string; category: string; authorAccountId: string;
  authorName: string; authorUuid: string | null;
  title: string; body: string;
  createdAt: number; lastPostAt: number;
  postCount: number; likeCount: number;
  pinned: boolean; locked: boolean; deleted: boolean;
  liked?: boolean;
}
interface Post {
  id: string; threadId: string; authorAccountId: string;
  authorName: string; authorUuid: string | null;
  content: string; createdAt: number; editedAt: number | null;
  likeCount: number; deleted: boolean;
  liked?: boolean;
}
interface Viewer {
  accountId: string; displayName: string;
  linked: boolean; playerUuid: string | null;
  banned: boolean; banReason: string | null;
}
interface CategoryInfo {
  id: string; fr: string; en: string; emoji: string; color: string;
}

const L = (fr: string, en: string, loc: string) => (loc === "fr" ? fr : en);

export default function ThreadPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const loc = locale || "fr";
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [cats, setCats] = useState<CategoryInfo[]>([]);
  const [staffCaps, setStaffCaps] = useState<{ moderate: boolean; ban: boolean }>({ moderate: false, ban: false });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [reportTarget, setReportTarget] = useState<{ type: "thread" | "post"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/community/threads/${id}`, { cache: "no-store" });
    if (r.status === 404) { setNotFound(true); setLoading(false); return; }
    const j = await r.json();
    setThread(j.thread);
    setPosts(j.posts || []);
    setLoading(false);
  }, [id]);

  const loadMeta = useCallback(async () => {
    const r = await fetch("/api/community/meta", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setCats(j.categories);
    setViewer(j.viewer);
    setStaffCaps(j.staff || { moderate: false, ban: false });
  }, []);

  useEffect(() => { load(); loadMeta(); }, [load, loadMeta]);

  const cat = cats.find((c) => c.id === thread?.category) || null;
  const canPost = !!viewer?.linked && !viewer?.banned && !thread?.locked && !thread?.deleted;

  const onReply = async () => {
    setReplyError(null);
    if (reply.trim().length < 2) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/community/threads/${id}/posts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setReplyError(mapError(j.error, loc));
        return;
      }
      setReply("");
      load();
    } finally {
      setPosting(false);
    }
  };

  const likeThread = async () => {
    if (!canPost && !(viewer?.linked && !viewer.banned)) return;
    if (!thread) return;
    setThread({ ...thread, liked: !thread.liked, likeCount: thread.likeCount + (thread.liked ? -1 : 1) });
    const r = await fetch(`/api/community/threads/${id}/like`, { method: "POST" });
    if (!r.ok) load();
  };

  const likePost = async (p: Post) => {
    if (!(viewer?.linked && !viewer.banned)) return;
    setPosts((list) => list.map((x) => x.id === p.id
      ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x));
    const r = await fetch(`/api/community/posts/${p.id}/like`, { method: "POST" });
    if (!r.ok) load();
  };

  const deleteThread = async () => {
    if (!thread) return;
    if (!confirm(L("Supprimer ce fil ?", "Delete this thread?", loc))) return;
    const r = await fetch(`/api/community/threads/${thread.id}`, { method: "DELETE" });
    if (r.ok) router.push(`/${loc}/community`);
  };

  const deletePost = async (p: Post) => {
    if (!confirm(L("Supprimer ce message ?", "Delete this message?", loc))) return;
    const r = await fetch(`/api/community/posts/${p.id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  const togglePin = async () => {
    if (!thread) return;
    await fetch(`/api/community/threads/${thread.id}/pin`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !thread.pinned }),
    });
    load();
  };

  const toggleLock = async () => {
    if (!thread) return;
    await fetch(`/api/community/threads/${thread.id}/lock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !thread.locked }),
    });
    load();
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    const url = reportTarget.type === "thread"
      ? `/api/community/threads/${reportTarget.id}/report`
      : `/api/community/posts/${reportTarget.id}/report`;
    await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason.slice(0, 500) }),
    });
    setReportTarget(null);
    setReportReason("");
    alert(L("Signalement envoyé. Merci !", "Report sent. Thank you!", loc));
  };

  if (loading) {
    return (
      <main><Navbar />
        <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
          <p className="text-center text-text-muted text-[13px]">{L("Chargement…", "Loading…", loc)}</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (notFound || !thread) {
    return (
      <main><Navbar />
        <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4 text-center">
          <p className="text-[14px] text-text-sub">{L("Fil introuvable.", "Thread not found.", loc)}</p>
          <Link href={`/${loc}/community` as never} className="inline-block mt-4 text-pink font-semibold text-[13px]">
            {L("← Retour à la communauté", "← Back to community", loc)}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const isAuthor = viewer?.accountId === thread.authorAccountId;

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
        <div className="max-w-[820px] mx-auto">
          <Link
            href={`/${loc}/community` as never}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text mb-4"
          >
            <ArrowLeft size={13} />
            {L("Communauté", "Community", loc)}
          </Link>

          {/* Thread card */}
          <article className="mc-card p-6">
            <header className="mb-3">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {cat && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{loc === "fr" ? cat.fr : cat.en}</span>
                  </span>
                )}
                {thread.pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                    <Pin size={9} />{L("épinglé", "pinned", loc)}
                  </span>
                )}
                {thread.locked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    <Lock size={9} />{L("verrouillé", "locked", loc)}
                  </span>
                )}
                {thread.deleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">
                    <Trash2 size={9} />{L("supprimé", "deleted", loc)}
                  </span>
                )}
              </div>
              <h1 className={`text-xl md:text-2xl font-bold text-text ${thread.deleted ? "line-through opacity-60" : ""}`}>
                {thread.title}
              </h1>
              <div className="mt-1.5 text-[12px] text-text-muted flex items-center gap-1.5">
                <span className="font-semibold text-text-sub">{thread.authorName}</span>
                <span>·</span>
                <span>{timeAgo(thread.createdAt, loc)}</span>
              </div>
            </header>

            {!thread.deleted && (
              <div className="text-[14px] text-text leading-relaxed">
                <RichText>{thread.body}</RichText>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={likeThread}
                  disabled={!(viewer?.linked && !viewer.banned) || thread.deleted}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border text-[12px] font-semibold transition-colors ${
                    thread.liked
                      ? "bg-pink-soft border-pink/30 text-pink"
                      : "bg-white border-border text-text-sub hover:border-pink"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Heart size={13} className={thread.liked ? "fill-pink" : ""} />
                  {compact(thread.likeCount)}
                </button>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white border border-border text-[12px] font-semibold text-text-sub">
                  <MessageSquare size={13} />
                  {thread.postCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {viewer?.linked && !viewer.banned && !thread.deleted && (
                  <button
                    onClick={() => setReportTarget({ type: "thread", id: thread.id })}
                    className="p-1.5 rounded-lg text-text-muted hover:text-orange-600 hover:bg-orange-50"
                    title={L("Signaler", "Report", loc)}
                  >
                    <Flag size={13} />
                  </button>
                )}
                {staffCaps.moderate && !thread.deleted && (
                  <>
                    <button onClick={togglePin} className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50" title={L("Épingler", "Pin", loc)}>
                      <Pin size={13} />
                    </button>
                    <button onClick={toggleLock} className="p-1.5 rounded-lg text-text-muted hover:text-slate-700 hover:bg-slate-100" title={L("Verrouiller", "Lock", loc)}>
                      <Lock size={13} />
                    </button>
                  </>
                )}
                {(staffCaps.moderate || isAuthor) && !thread.deleted && (
                  <button onClick={deleteThread} className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50" title={L("Supprimer", "Delete", loc)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </article>

          {/* Replies */}
          <div className="mt-6">
            <h2 className="text-[13px] font-bold text-text mb-3 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-pink" />
              {thread.postCount} {L("réponses", "replies", loc)}
            </h2>

            {posts.length === 0 ? (
              <div className="mc-card p-6 text-center">
                <p className="text-[13px] text-text-muted">
                  {L("Pas encore de réponse. Sois le premier !", "No replies yet. Be the first!", loc)}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {posts.map((p) => {
                  const postAuthor = viewer?.accountId === p.authorAccountId;
                  return (
                    <li key={p.id} className="mc-card p-4">
                      <div className="flex items-start justify-between mb-1.5 gap-3">
                        <div className="text-[12px] text-text-muted flex items-center gap-1.5 min-w-0">
                          <Link
                            href={p.authorUuid ? `/${loc}/profile/${p.authorUuid}` as never : "#"}
                            className="font-semibold text-text-sub truncate hover:text-pink"
                          >
                            {p.authorName}
                          </Link>
                          <span>·</span>
                          <span>{timeAgo(p.createdAt, loc)}</span>
                          {p.deleted && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">
                              <Trash2 size={9} />{L("supprimé", "deleted", loc)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {viewer?.linked && !viewer.banned && !p.deleted && (
                            <button
                              onClick={() => setReportTarget({ type: "post", id: p.id })}
                              className="p-1 rounded-md text-text-muted hover:text-orange-600 hover:bg-orange-50"
                              title={L("Signaler", "Report", loc)}
                            >
                              <Flag size={12} />
                            </button>
                          )}
                          {(staffCaps.moderate || postAuthor) && !p.deleted && (
                            <button
                              onClick={() => deletePost(p)}
                              className="p-1 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50"
                              title={L("Supprimer", "Delete", loc)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      {p.deleted ? (
                        <p className="text-[12px] italic text-text-muted">
                          {L("Message supprimé.", "Message deleted.", loc)}
                        </p>
                      ) : (
                        <div className="text-[13px] text-text leading-relaxed">
                          <RichText>{p.content}</RichText>
                        </div>
                      )}
                      {!p.deleted && (
                        <div className="mt-2">
                          <button
                            onClick={() => likePost(p)}
                            disabled={!(viewer?.linked && !viewer.banned)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              p.liked ? "bg-pink-soft text-pink" : "text-text-muted hover:text-pink hover:bg-pink-soft"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <Heart size={11} className={p.liked ? "fill-pink" : ""} />
                            {compact(p.likeCount)}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Reply composer */}
          <div className="mt-6 mc-card p-4">
            {thread.deleted ? (
              <p className="text-[12px] text-text-muted text-center py-2">
                {L("Fil supprimé.", "Thread deleted.", loc)}
              </p>
            ) : thread.locked ? (
              <div className="flex items-center justify-center gap-2 text-[12px] text-text-muted py-2">
                <Lock size={13} />{L("Ce fil est verrouillé.", "This thread is locked.", loc)}
              </div>
            ) : !viewer ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[13px] text-text-sub">{L("Connecte-toi pour répondre.", "Sign in to reply.", loc)}</p>
                <Link href={`/${loc}/account` as never} className="btn-primary !text-[12px] !py-1.5 !px-3 !rounded-[10px]">
                  {L("Se connecter", "Sign in", loc)}
                </Link>
              </div>
            ) : !viewer.linked ? (
              <div className="flex items-center gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-[10px] p-3">
                <AlertTriangle size={14} />
                <span>{L("Lie ton pseudo Minecraft pour poster.", "Link your Minecraft account to post.", loc)}</span>
                <Link href={`/${loc}/account` as never} className="ml-auto underline font-semibold">
                  {L("Lier", "Link", loc)}
                </Link>
              </div>
            ) : viewer.banned ? (
              <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[10px] p-3">
                {L("Tu es banni de la communauté.", "You are banned from the community.", loc)}
              </div>
            ) : (
              <>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  {L("Ta réponse", "Your reply", loc)}
                  <span className="font-normal text-text-muted ml-1">({reply.length}/4000)</span>
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value.slice(0, 4000))}
                  rows={3}
                  placeholder={L("Répondre…", "Reply…", loc)}
                  className="w-full bg-white border border-border rounded-[10px] py-2.5 px-3 text-[13px] focus:outline-none focus:border-pink resize-y"
                />
                {replyError && (
                  <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2 mt-2">
                    {replyError}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={onReply}
                    disabled={posting || reply.trim().length < 2}
                    className="btn-primary !text-[12px] !py-2 !px-4 !rounded-[10px] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={13} />
                    {posting ? L("Envoi…", "Sending…", loc) : L("Répondre", "Reply", loc)}
                  </button>
                </div>
              </>
            )}
          </div>

          {staffCaps.moderate && (
            <div className="mt-4 text-center">
              <Link href={`/${loc}/community/moderation` as never}
                className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text">
                <Shield size={12} />{L("Panneau de modération", "Moderation panel", loc)}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setReportTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[480px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-[14px] font-bold text-text inline-flex items-center gap-2">
                <Flag size={14} className="text-orange-600" />
                {L("Signaler", "Report", loc)}
              </h3>
              <button onClick={() => setReportTarget(null)} className="text-text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                {L("Raison", "Reason", loc)}
                <span className="font-normal text-text-muted ml-1">({reportReason.length}/500)</span>
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value.slice(0, 500))}
                rows={4}
                placeholder={L("Pourquoi signaler ?", "Why are you reporting?", loc)}
                className="w-full bg-white border border-border rounded-[10px] py-2.5 px-3 text-[13px] focus:outline-none focus:border-pink resize-y"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setReportTarget(null)}
                  className="px-4 py-2 rounded-[10px] border border-border text-[13px] font-medium text-text-sub hover:text-text">
                  {L("Annuler", "Cancel", loc)}
                </button>
                <button onClick={submitReport}
                  className="btn-primary !text-[13px] !py-2 !px-4 !rounded-[10px]">
                  {L("Envoyer", "Send", loc)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

function mapError(code: string | undefined, loc: string): string {
  switch (code) {
    case "rate_limited": return L("Trop rapide, attends un peu.", "Too fast, wait a bit.", loc);
    case "banned": return L("Tu es banni de la communauté.", "You are banned from the community.", loc);
    case "not_linked": return L("Compte non lié.", "Account not linked.", loc);
    case "content_too_short": return L("Message trop court.", "Message too short.", loc);
    case "thread_locked": return L("Fil verrouillé.", "Thread locked.", loc);
    case "thread_deleted": return L("Fil supprimé.", "Thread deleted.", loc);
    default: return L("Erreur, réessaye.", "Error, try again.", loc);
  }
}
