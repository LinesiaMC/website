export function timeAgo(ts: number, locale: string): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  const fr = locale === "fr";
  if (s < 60) return fr ? "à l'instant" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return fr ? `il y a ${m} min` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return fr ? `il y a ${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return fr ? `il y a ${d} j` : `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return fr ? `il y a ${w} sem.` : `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return fr ? `il y a ${mo} mois` : `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return fr ? `il y a ${y} an${y > 1 ? "s" : ""}` : `${y}y ago`;
}

export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Simple linkifier: escapes HTML then turns http(s) urls into <a> tags.
 *  Returned as an array of React-renderable parts. */
export type RichPart =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string };

export function parseRich(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const re = /https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    parts.push({ kind: "link", href: m[0], label: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}
