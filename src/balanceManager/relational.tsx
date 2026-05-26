// Relational (auto-derived) vs attachment (abilities / tool powers) footers
// for Dev Panel entity cards.

import { useEffect } from "react";
import type { ReactNode } from "react";
import Icon from "../ui/Icon.jsx";
import { COLORS } from "./shared.jsx";
import { useBalanceNav } from "./balanceNav.jsx";

export const ATTACHMENT_FOOTER_STYLE = {
  background: "rgba(126, 122, 166, 0.10)",
  borderTop: `1px dashed ${COLORS.violet}88`,
};

export const RELATIONAL_FOOTER_STYLE = {
  background: "rgba(90, 94, 102, 0.08)",
  borderTop: `1px dashed ${COLORS.slate}66`,
};

export function CardAttachmentFooter({ title, children, className = "", standalone = false }: { title?: ReactNode; children: ReactNode; className?: string; standalone?: boolean }) {
  const edgeClass = standalone
    ? "mt-3 rounded-lg border px-3 pt-3 pb-3"
    : "mt-3 -mx-3 -mb-3 px-3 pt-3 pb-3 rounded-b-[10px]";
  return (
    <div
      className={`${edgeClass} ${className}`}
      style={{
        ...ATTACHMENT_FOOTER_STYLE,
        ...(standalone ? { borderColor: `${COLORS.violet}55` } : {}),
      }}
    >
      {title && (
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.violet }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function RelationalFooter({ title = "Related", hint, children, className = "", standalone = false }: { title?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; standalone?: boolean }) {
  const edgeClass = standalone
    ? "mt-3 rounded-lg border px-3 pt-3 pb-3"
    : "mt-3 -mx-3 -mb-3 px-3 pt-3 pb-3 rounded-b-[10px]";
  return (
    <div
      className={`${edgeClass} ${className}`}
      style={{
        ...RELATIONAL_FOOTER_STYLE,
        ...(standalone ? { borderColor: `${COLORS.slate}55` } : {}),
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.slate }}>
          {title}
        </div>
        {hint && (
          <div className="text-[9px] italic" style={{ color: COLORS.inkSubtle }}>{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export function RefButton({ children, onClick, title, className = "" }: { children: ReactNode; onClick: () => void; title?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-left transition-opacity hover:opacity-90 ${className}`}
      style={{
        background: "rgba(90, 94, 102, 0.12)",
        borderColor: `${COLORS.slate}99`,
        color: COLORS.slate,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

export function balanceEntityDomId(entityId: string | null | undefined): string | undefined {
  return entityId ? `bm-${entityId}` : undefined;
}

export function useScrollToFocus(focus: string | null | undefined): void {
  useEffect(() => {
    if (!focus) return;
    const domId = balanceEntityDomId(focus);
    if (!domId) return;
    document.getElementById(domId)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);
}

export function focusHighlightProps(entityId: string | null | undefined, focus: string | null | undefined) {
  const isFocused = Boolean(entityId && focus === entityId);
  return {
    id: balanceEntityDomId(entityId),
    isFocused,
    ringStyle: isFocused
      ? { boxShadow: `0 0 0 2px ${COLORS.ember}, 0 0 0 4px ${COLORS.ember}44` }
      : undefined,
  };
}

export type UsageKind = "recipe_input" | "recipe_output" | "building_cost" | "chain_next" | "story_outcome";

export interface Usage {
  kind: UsageKind | string;
  recipeId?: string;
  buildingId?: string;
  fromId?: string;
  beatId?: string;
  choiceId?: string;
  qty?: number;
}

const USAGE_KIND_LABELS: Record<string, string> = {
  recipe_input: "Recipe input",
  recipe_output: "Recipe output",
  building_cost: "Building cost",
  chain_next: "Chain feeder",
  story_outcome: "Story reward",
};

export function navTargetForUsage(usage: Usage | null | undefined): { tab: string; focus: string | undefined } | null {
  if (!usage?.kind) return null;
  switch (usage.kind) {
    case "recipe_input":
    case "recipe_output":
      return { tab: "recipes", focus: usage.recipeId };
    case "building_cost":
      return { tab: "buildings", focus: usage.buildingId };
    case "chain_next":
      return { tab: "items", focus: usage.fromId };
    case "story_outcome":
      return { tab: "story", focus: usage.beatId };
    default:
      return null;
  }
}

export function usageRefLabel(usage: Usage): string {
  if (usage.kind === "recipe_input") return `${usage.recipeId} · ${usage.qty}× in`;
  if (usage.kind === "recipe_output") return `${usage.recipeId} (output)`;
  if (usage.kind === "building_cost") return `${usage.buildingId} · ${usage.qty}×`;
  if (usage.kind === "chain_next") return `← ${usage.fromId}`;
  if (usage.kind === "story_outcome") {
    const qty = usage.qty ?? 0;
    return `${usage.beatId}/${usage.choiceId} · ${qty > 0 ? "+" : ""}${qty}`;
  }
  return usage.kind;
}

export function WhereUsedLinks({ usages }: { usages: Usage[] | undefined | null }) {
  const { navigate } = useBalanceNav();
  if (!usages?.length) {
    return <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Not referenced anywhere.</div>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {usages.map((u, i) => {
        const target = navTargetForUsage(u);
        const label = usageRefLabel(u);
        const title = USAGE_KIND_LABELS[u.kind] || u.kind;
        if (!target) {
          return (
            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{ background: COLORS.parchmentDeep, color: COLORS.inkSubtle }}>
              {label}
            </span>
          );
        }
        return (
          <RefButton key={i} title={`${title} — open ${target.tab}`}
            onClick={() => navigate({ tab: target.tab, focus: target.focus })}>
            <span className="font-mono">{label}</span>
          </RefButton>
        );
      })}
    </div>
  );
}

export interface CraftingRecipeRef {
  recId: string;
  station: string;
  inputs?: Record<string, number>;
}

export function CraftingRecipeLinks({ recipes }: { recipes: CraftingRecipeRef[] | undefined | null }) {
  const { navigate } = useBalanceNav();
  if (!recipes?.length) {
    return <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Not craftable.</div>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {recipes.map((rec) => (
        <RefButton key={rec.recId} title={`Open recipe ${rec.recId}`}
          onClick={() => navigate({ tab: "recipes", focus: rec.recId })}
          className="w-full flex-wrap">
          <PillInline>{rec.station}</PillInline>
          <span className="font-mono">{rec.recId}</span>
          <span className="opacity-80">·</span>
          {Object.entries(rec.inputs || {}).map(([inp, qty]) => (
            <span key={inp} className="inline-flex items-center gap-0.5 opacity-90">
              <Icon iconKey={inp} size={12} />{qty}×
            </span>
          ))}
        </RefButton>
      ))}
    </div>
  );
}

function PillInline({ children }: { children: ReactNode }) {
  return (
    <span className="px-1 py-0.5 rounded text-[9px] font-bold uppercase"
      style={{ background: COLORS.parchmentDeep, color: COLORS.inkLight }}>
      {children}
    </span>
  );
}
