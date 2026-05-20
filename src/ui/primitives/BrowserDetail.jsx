import Button from "./Button.jsx";
import { CostChip, RequirementChip } from "./Chip.jsx";
import ProgressTrack from "./ProgressTrack.jsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function BrowserDetailLayout({ toolbar, browser, detail, className = "" }) {
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

export function BrowserGrid({ children, min = 128, className = "" }) {
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
        <span className="hl-browser-item__title">{title}</span>
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
          <h3 className="hl-detail-pane__title">{title}</h3>
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

export function CostGrid({ entries = [], title = "Cost", empty = "No cost", className = "" }) {
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

export function AbilitySummary({ abilities, effects, empty = "No special bonus." }) {
  const rows = [];
  if (Array.isArray(abilities)) {
    for (const ab of abilities) {
      const p = ab?.params || {};
      switch (ab?.id) {
        case "free_moves":
          rows.push(`${p.count ?? 1} free move${(p.count ?? 1) === 1 ? "" : "s"}`);
          break;
        case "pool_weight":
        case "pool_weight_legacy":
          rows.push(`Boosts ${p.target ?? "spawn"} by ${p.amount ?? 1}`);
          break;
        case "threshold_reduce":
          rows.push(`Reduces ${p.target ?? "a chain"} by ${p.amount ?? 1}`);
          break;
        case "threshold_reduce_category":
          rows.push(`Reduces ${p.category ?? "category"} chains by ${p.amount ?? 1}`);
          break;
        case "recipe_input_reduce":
          rows.push(`Reduces ${p.recipe ?? "recipe"} ${p.input ?? "input"} by ${p.amount ?? 1}`);
          break;
        case "season_bonus":
          rows.push(`Season bonus: ${p.amount ?? 0} ${p.resource ?? "coins"}`);
          break;
        default:
          if (ab?.id) rows.push(ab.id.replaceAll("_", " "));
      }
    }
  }
  if (effects?.freeMoves) rows.push(`${effects.freeMoves} free move${effects.freeMoves === 1 ? "" : "s"}`);
  if (effects?.coinBonusFlat) rows.push(`+${effects.coinBonusFlat} coins`);
  if (effects?.coinBonusPerTile) rows.push(`+${effects.coinBonusPerTile} coins per tile`);
  if (effects?.freeMovesIfChain?.minChain) rows.push(`Free move on ${effects.freeMovesIfChain.minChain}+ chain`);

  const unique = [...new Set(rows)].filter(Boolean);
  if (unique.length === 0) return <div className="hl-text-faint italic">{empty}</div>;
  return (
    <ul className="hl-ability-list">
      {unique.map((row) => <li key={row}>{row}</li>)}
    </ul>
  );
}

export function DetailProgress({ value, max, label, tone = "moss" }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-caption font-bold text-on-panel-dim">
        <span>{label}</span>
        <span className="tabular-nums">{value}/{max}</span>
      </div>
      <ProgressTrack value={value} max={max} tone={tone} size="sm" />
    </div>
  );
}

export function DetailActionButton(props) {
  return <Button block size="md" {...props} />;
}
