"use client";

import { parseRich } from "./utils";

/** Safely renders user text with auto-linked URLs. All text passes through
 *  React's default escaping; only http(s):// URLs become <a> tags. */
export default function RichText({ children, className = "" }: { children: string; className?: string }) {
  const parts = parseRich(children);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="nofollow noopener noreferrer ugc"
            className="text-pink underline underline-offset-2 hover:opacity-80 break-all"
          >
            {p.label}
          </a>
        ),
      )}
    </p>
  );
}
