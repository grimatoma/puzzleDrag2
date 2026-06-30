import AutoFitText from "./AutoFitText.jsx";
import Button from "./Button.jsx";
import { CostChip, RequirementChip } from "./Chip.jsx";
import ProgressTrack from "./ProgressTrack.jsx";
import { getItem, RECIPES } from "../../constants.js";
import { iconLabel } from "../../textures/iconRegistry.js";
import { producedResource } from "../../game/producedResource.js";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function BrowserDetailLayout({ toolbar, browser, detail, className = "" }: { toolbar?: React.ReactNode; browser: React.ReactNode; detail: React.ReactNode; className?: string }) {
  return (
    <div className={cx("hl-browser-detail", className)}>
      {toolbar && <div className="hl-browser-toolbar">{toolbar}</div>}
      <div className="hl-browser-detail__body">
        <div className="hl-browser-list">{browser}</div>
        <div className="hl-browser-pane">{detail}</div>
      </div>
    </div>
  );
}

export function BrowserGrid({ children, min = 128, className = "" }: { children?: React.ReactNode; min?: number; className?: string }) {
  return (
    <div
      className={cx("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function BrowserItemButton({
  selected = false,
  muted = false,
  active = false,
  icon,
  title,
  subtitle,
  count,
  status,
  onClick,
  className = "",
  children,
  ...rest
}: {
  selected?: boolean;
  muted?: boolean;
  active?: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  count?: number | string | null;
  status?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  children?: React.ReactNode;
  [x: string]: unknown;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "hl-browser-item",
        selected && "is-selected",
        muted && "is-muted",
        active && "is-active",
        className,
      )}
      {...rest}
    >
      <span className="hl-browser-item__icon">{icon}</span>
      <span className="hl-browser-item__main">
        <AutoFitText className="hl-browser-item__title" maxFontSize={14} minFontSize={10} title={typeof title === "string" ? title : undefined}>
          {title}
        </AutoFitText>
        {subtitle && <span className="hl-browser-item__subtitle">{subtitle}</span>}
        {children}
      </span>
      {(count != null || status) && (
        <span className="hl-browser-item__meta">
          {count != null && <span className="tabular-nums">{count}</span>}
          {status && <span>{status}</span>}
        </span>
      )}
    </button>
  );
}

export function DetailPane({
  title,
  eyebrow,
  icon,
  status,
  description,
  children,
  actions,
  headerActions,
  empty,
  className = "",
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  status?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (empty) {
    return (
      <div className={cx("hl-detail-pane", className)}>
        <div className="hl-empty">{empty}</div>
      </div>
    );
  }

  return (
    <section className={cx("hl-detail-pane", className)}>
      <div className="hl-detail-pane__header">
        {icon && <div className="hl-detail-pane__icon">{icon}</div>}
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="hl-detail-pane__eyebrow">{eyebrow}</div>}
          <AutoFitText as="h3" className="hl-detail-pane__title" maxFontSize={18} minFontSize={12} title={typeof title === "string" ? title : undefined}>
            {title}
          </AutoFitText>
          {status && <div className="hl-detail-pane__status">{status}</div>}
        </div>
        {headerActions && <div className="flex-shrink-0 flex flex-col gap-1.5 justify-center self-center">{headerActions}</div>}
      </div>
      {description && <p className="hl-detail-pane__description">{description}</p>}
      {children && <div className="hl-detail-pane__content">{children}</div>}
      {actions && <div className="hl-detail-pane__actions">{actions}</div>}
    </section>
  );
}

interface CostEntry {
  key: string;
  label?: string;
  amount?: number;
  have?: number;
  ok?: boolean;
  icon?: React.ReactNode;
  showHave?: boolean;
  check?: boolean;
}

export function CostGrid({ entries = [], title = "Cost", empty = "No cost", className = "" }: { entries?: CostEntry[]; title?: string; empty?: string; className?: string }) {
  const clean = entries.filter((e) => e && e.key && Number(e.amount) > 0);
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {title && <div className="hl-section-label">{title}</div>}
      {clean.length === 0 ? (
        <div className="hl-text-faint italic">{empty}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
          {clean.map((e) => {
            const have = Number(e.have ?? 0);
            const amount = Number(e.amount ?? 0);
            const ok = e.ok ?? have >= amount;
            const Chip = e.check ? RequirementChip : CostChip;
            return (
              <Chip key={e.key} ok={ok}>
                {e.icon}
                <span className="truncate">{e.label ?? e.key}</span>
                <span className="tabular-nums">{e.showHave ? `${have}/${amount}` : amount}</span>
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AbilitySpec {
  id?: string;
  params?: Record<string, unknown>;
}

interface AbilityEffects {
  freeMoves?: number;
  coinBonusFlat?: number;
  coinBonusPerTile?: number;
  freeMovesIfChain?: { minChain?: number };
}

/**
 * Resolve a catalog key (resource / tile / tile-variant / recipe) to a human label for
 * player-facing ability copy. Mirrors `labelFor` in Inventory.tsx (iconLabel → ITEMS.label),
 * with a final humanizing fallback so a tile-variant id that lives outside ITEMS
 * (e.g. "tile_grass_meadow") never leaks its raw snake_case key into the summary.
 */
function humanizeKey(key: string): string {
  return String(key)
    .replace(/^tile_[a-z0-9]+_/, "")
    .replace(/^tile_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
function abilityLabel(key: unknown): string {
  const k = String(key ?? "").trim();
  if (!k) return "";
  return iconLabel(k) || getItem(k)?.label || humanizeKey(k);
}
const plural = (n: unknown): string => (Number(n) === 1 ? "" : "s");
function categoryLabel(key: unknown): string {
  const k = String(key ?? "").trim();
  if (!k) return "category";
  return humanizeKey(k.replace(/^(mine|farm|fish|forest)_/, ""));
}
function recipeOutputLabel(key: unknown): string {
  const k = String(key ?? "").trim();
  const item = k ? RECIPES[k]?.item : undefined;
  return (item && (getItem(item)?.label ?? item)) || abilityLabel(k) || "recipe";
}

/**
 * Convert a host's attached `abilities` (and any rolled-up passive `effects`)
 * into short, plain-English clauses describing what it does. Shared by the
 * tile cards (list form) and the build menu (pill form) so the wording for an
 * ability id is written once. Covers every ability id attached to buildings.
 */
export function abilitySummaryRows(abilities?: AbilitySpec[] | unknown, effects?: AbilityEffects): string[] {
  const rows: string[] = [];
  if (Array.isArray(abilities)) {
    for (const ab of abilities as AbilitySpec[]) {
      const p = (ab?.params ?? {}) as Record<string, unknown>;
      const amt = p.amount ?? 1;
      switch (ab?.id) {
        case "free_moves":
          rows.push(`${p.count ?? 1} free move${plural(p.count ?? 1)}`);
          break;
        case "pool_weight":
        case "pool_weight_legacy":
          rows.push(`Boosts ${abilityLabel(p.target) || "spawn"} by ${amt}`);
          break;
        case "threshold_reduce":
          rows.push(`Reduces ${abilityLabel(p.target) || "a chain"} by ${amt}`);
          break;
        case "threshold_reduce_category":
          rows.push(`${categoryLabel(p.category)} chains upgrade ${amt} step${plural(amt)} sooner`);
          break;
        case "recipe_input_reduce":
          rows.push(`${recipeOutputLabel(p.recipe)} needs ${amt} less ${abilityLabel(p.input) || "input"}`);
          break;
        case "bonus_yield": {
          const yielded = producedResource({ key: String(p.target ?? "") });
          const yieldedLabel = yielded ? (getItem(yielded)?.label ?? yielded) : "yield";
          rows.push(`+${amt} ${yieldedLabel} from ${abilityLabel(p.target) || "matching"} chains`);
          break;
        }
        case "season_bonus":
          rows.push(`+${p.amount ?? 0} ${abilityLabel(p.resource) || "coins"} each season`);
          break;
        case "grant_tool":
          rows.push(`+${amt} ${abilityLabel(p.tool) || "tool"} each season`);
          break;
        case "worker_pool_step":
          rows.push(`+${amt} villager${plural(amt)} to the hiring pool each season`);
          break;
        case "turn_budget_bonus":
          rows.push(`+${amt} puzzle turn${plural(amt)} per session`);
          break;
        case "inventory_cap_bonus":
          rows.push(`+${amt} inventory capacity`);
          break;
        case "preserve_board":
          rows.push(`Preserves the ${humanizeKey(String(p.biome ?? ""))} board between sessions`);
          break;
        default:
          if (ab?.id) rows.push(ab.id.replaceAll("_", " "));
      }
    }
  }
  if (effects?.freeMoves) rows.push(`${effects.freeMoves} free move${plural(effects.freeMoves)}`);
  if (effects?.coinBonusFlat) rows.push(`+${effects.coinBonusFlat} coins`);
  if (effects?.coinBonusPerTile) rows.push(`+${effects.coinBonusPerTile} coins per tile`);
  if (effects?.freeMovesIfChain?.minChain) rows.push(`Free move on ${effects.freeMovesIfChain.minChain}+ chain`);

  return [...new Set(rows)].filter(Boolean);
}

export function AbilitySummary({ abilities, effects, empty = "No special bonus." }: { abilities?: AbilitySpec[] | unknown; effects?: AbilityEffects; empty?: React.ReactNode }) {
  const unique = abilitySummaryRows(abilities, effects);
  if (unique.length === 0) return empty == null ? null : <div className="hl-text-faint italic">{empty}</div>;
  return (
    <ul className="hl-ability-list">
      {unique.map((row) => <li key={row}>{row}</li>)}
    </ul>
  );
}

export function DetailProgress({ value, max, label, tone = "moss" }: { value: number; max: number | undefined; label: React.ReactNode; tone?: "ember" | "moss" | "gold" }) {
  const safeMax = max ?? 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-caption font-bold text-on-panel-dim">
        <span>{label}</span>
        <span className="tabular-nums">{value}/{safeMax}</span>
      </div>
      <ProgressTrack value={value} max={safeMax} tone={tone} size="sm" />
    </div>
  );
}

export function DetailActionButton(props: Record<string, unknown>) {
  return <Button block size="md" {...props} />;
}
