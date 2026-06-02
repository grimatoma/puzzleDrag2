/**
 * TableOfContents.tsx — Sticky in-page navigation for wiki articles.
 *
 * Renders a small nav listing section anchors. Each link smooth-scrolls to the
 * corresponding heading (which must have an `id` matching `TocItem.id`).
 *
 * Returns null when items is empty so callers can use it unconditionally.
 */

import React from "react";
import { COLORS } from "../shared.jsx";

export interface TocItem {
  id: string;
  label: string;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      style={{
        background: COLORS.parchment,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "10px 14px",
      }}
      aria-label="Table of contents"
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: COLORS.inkSubtle,
          marginBottom: 6,
        }}
      >
        Contents
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              style={{
                fontSize: 11,
                color: COLORS.ember,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
