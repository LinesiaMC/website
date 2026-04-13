"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, Map, X, Save, CheckCircle2, Circle,
  Clock, Rocket, ListChecks, GripVertical,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";

type RoadmapStatus = "planned" | "in_progress" | "released";

interface RoadmapItem {
  title: string;
  done: boolean;
}

interface RoadmapEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  date: string;
  locale: "fr" | "en";
  items: RoadmapItem[];
  sortOrder: number;
  createdAt: number;
}

const STATUS_META: Record<RoadmapStatus, { fr: string; en: string; color: string; icon: typeof Clock }> = {
  planned:     { fr: "Planifié",    en: "Planned",     color: "bg-slate-100 text-slate-600",   icon: Clock },
  in_progress: { fr: "En cours",    en: "In progress", color: "bg-amber-50 text-amber-700",    icon: ListChecks },
  released:    { fr: "Publié",      en: "Released",    color: "bg-emerald-50 text-emerald-700", icon: Rocket },
};

export default function AdminRoadmapPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();

  const [entries, setEntries] = useState<RoadmapEntry[]>([]);
  const [editing, setEditing] = useState<RoadmapEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | RoadmapStatus>("all");

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      roadmap:       { fr: "Roadmap", en: "Roadmap" },
      subtitle:      { fr: "Planifiez les prochaines versions et fonctionnalités", en: "Plan upcoming versions and features" },
      addEntry:      { fr: "Nouvelle entrée", en: "New entry" },
      editEntry:     { fr: "Modifier l'entrée", en: "Edit entry" },
      noEntries:     { fr: "Aucune entrée", en: "No entries" },
      version:       { fr: "Version", en: "Version" },
      titleField:    { fr: "Titre", en: "Title" },
      descField:     { fr: "Description", en: "Description" },
      statusField:   { fr: "Statut", en: "Status" },
      dateField:     { fr: "Date prévue", en: "Target date" },
      items:         { fr: "Fonctionnalités", en: "Features" },
      addItem:       { fr: "Ajouter une fonctionnalité", en: "Add a feature" },
      itemTitle:     { fr: "Titre de la fonctionnalité...", en: "Feature title..." },
      order:         { fr: "Ordre d'affichage", en: "Display order" },
      save:          { fr: "Enregistrer", en: "Save" },
      cancel:        { fr: "Annuler", en: "Cancel" },
      all:           { fr: "Tout", en: "All" },
      planned:       { fr: "Planifiés", en: "Planned" },
      inProgress:    { fr: "En cours", en: "In progress" },
      released:      { fr: "Publiés", en: "Released" },
      deleteConfirm: { fr: "Supprimer cette entrée de roadmap ?", en: "Delete this roadmap entry?" },
      langField:     { fr: "Langue", en: "Language" },
    };
    return labels[key]?.[locale] || labels[key]?.en || key;
  };

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/roadmap");
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async (data: Omit<RoadmapEntry, "id" | "createdAt"> & { id?: string }) => {
    if (data.id) {
      await fetch("/api/roadmap", { method: "PUT", headers: headers(), body: JSON.stringify(data) });
    } else {
      await fetch("/api/roadmap", { method: "POST", headers: headers(), body: JSON.stringify(data) });
    }
    setEditing(null);
    setCreating(false);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/roadmap?id=${id}`, { method: "DELETE", headers: headers() });
    fetchEntries();
  };

  const toggleItem = async (entry: RoadmapEntry, idx: number) => {
    const newItems = entry.items.map((it, i) => i === idx ? { ...it, done: !it.done } : it);
    const body = { ...entry, items: newItems };
    await fetch("/api/roadmap", { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    fetchEntries();
  };

  if (creating || editing) {
    return (
      <RoadmapForm
        entry={editing}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setCreating(false); }}
        t={t}
      />
    );
  }

  const filtered = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  const counts = {
    all: entries.length,
    planned: entries.filter((e) => e.status === "planned").length,
    in_progress: entries.filter((e) => e.status === "in_progress").length,
    released: entries.filter((e) => e.status === "released").length,
  };

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <Map size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{t("roadmap")}</h1>
            <p className="text-[12px] text-text-muted">{t("subtitle")}</p>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary !py-2 !px-4 !text-[13px]">
          <Plus size={15} />
          {t("addEntry")}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {([
          ["all", t("all"), counts.all],
          ["planned", t("planned"), counts.planned],
          ["in_progress", t("inProgress"), counts.in_progress],
          ["released", t("released"), counts.released],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
              filter === key
                ? "bg-pink text-white border-pink"
                : "bg-white text-text-sub border-border hover:border-pink/50"
            }`}
          >
            {label} <span className="opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mc-card p-12 text-center">
          <Map size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{t("noEntries")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const meta = STATUS_META[entry.status];
            const Icon = meta.icon;
            const doneCount = entry.items.filter((i) => i.done).length;
            const progress = entry.items.length > 0 ? Math.round((doneCount / entry.items.length) * 100) : 0;
            return (
              <div key={entry.id} className="mc-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex items-center text-text-muted pt-1">
                    <GripVertical size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${meta.color}`}>
                        <Icon size={11} />
                        {meta[locale as "fr" | "en"]}
                      </span>
                      {entry.version && (
                        <span className="text-[11px] font-bold text-pink bg-pink/10 px-2 py-0.5 rounded">
                          v{entry.version}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-text-muted uppercase">{entry.locale}</span>
                      {entry.date && (
                        <span className="text-[11px] text-text-muted">{entry.date}</span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-bold text-text mb-1">{entry.title}</h3>
                    {entry.description && (
                      <p className="text-[12px] text-text-sub mb-3 whitespace-pre-wrap">{entry.description}</p>
                    )}
                    {entry.items.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-bg-soft rounded-full overflow-hidden">
                            <div className="h-full bg-pink transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] font-semibold text-text-sub">{doneCount}/{entry.items.length}</span>
                        </div>
                        <ul className="space-y-1">
                          {entry.items.map((item, i) => (
                            <li key={i}>
                              <button
                                onClick={() => toggleItem(entry, i)}
                                className="flex items-start gap-2 w-full text-left hover:bg-bg-soft rounded-lg px-2 py-1 transition-colors"
                              >
                                {item.done ? (
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle size={14} className="text-text-muted shrink-0 mt-0.5" />
                                )}
                                <span className={`text-[12px] ${item.done ? "line-through text-text-muted" : "text-text-sub"}`}>
                                  {item.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(entry)}
                      className="p-2 rounded-lg hover:bg-bg-soft text-text-sub hover:text-pink transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-text-sub hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoadmapForm({
  entry, onSave, onCancel, t,
}: {
  entry: RoadmapEntry | null;
  onSave: (data: Omit<RoadmapEntry, "id" | "createdAt"> & { id?: string }) => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const [version, setVersion] = useState(entry?.version || "");
  const [title, setTitle] = useState(entry?.title || "");
  const [description, setDescription] = useState(entry?.description || "");
  const [status, setStatus] = useState<RoadmapStatus>(entry?.status || "planned");
  const [date, setDate] = useState(entry?.date || "");
  const [entryLocale, setEntryLocale] = useState<"fr" | "en">(entry?.locale || "fr");
  const [items, setItems] = useState<RoadmapItem[]>(entry?.items || []);
  const [sortOrder, setSortOrder] = useState(entry?.sortOrder ?? 0);

  const addItem = () => setItems([...items, { title: "", done: false }]);
  const updateItem = (i: number, patch: Partial<RoadmapItem>) =>
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      ...(entry ? { id: entry.id } : {}),
      version: version.trim(),
      title: title.trim(),
      description: description.trim(),
      status,
      date,
      locale: entryLocale,
      items: items
        .map((i) => ({ title: i.title.trim(), done: i.done }))
        .filter((i) => i.title),
      sortOrder,
    });
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text">
          {entry ? t("editEntry") : t("addEntry")}
        </h1>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white text-text-sub">
          <X size={18} />
        </button>
      </div>
      <div className="mc-card p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("langField")}</label>
            <select value={entryLocale} onChange={(e) => setEntryLocale(e.target.value as "fr" | "en")} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("version")}</label>
            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("dateField")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("statusField")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RoadmapStatus)} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none">
              <option value="planned">{STATUS_META.planned[entryLocale]}</option>
              <option value="in_progress">{STATUS_META.in_progress[entryLocale]}</option>
              <option value="released">{STATUS_META.released[entryLocale]}</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("order")}</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text focus:border-pink focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("titleField")}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mise à jour automne 2026..." className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none" />
        </div>

        <div>
          <label className="text-[12px] font-semibold text-text-sub mb-1.5 block uppercase tracking-wider">{t("descField")}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de la version, changements majeurs..." rows={4} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none resize-y" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold text-text-sub uppercase tracking-wider">{t("items")}</label>
            <button type="button" onClick={addItem} className="text-[12px] font-semibold text-pink hover:underline inline-flex items-center gap-1">
              <Plus size={13} /> {t("addItem")}
            </button>
          </div>
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-[12px] text-text-muted italic">—</p>
            )}
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateItem(i, { done: !item.done })}
                  className="shrink-0 p-1"
                >
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Circle size={18} className="text-text-muted" />
                  )}
                </button>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                  placeholder={t("itemTitle")}
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-white text-[13px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="shrink-0 p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onCancel} className="btn-ghost !py-2 !px-5 !text-[13px]">{t("cancel")}</button>
          <button onClick={handleSubmit} className="btn-primary !py-2 !px-5 !text-[13px]"><Save size={14} />{t("save")}</button>
        </div>
      </div>
    </div>
  );
}
