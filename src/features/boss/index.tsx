
import { BOSS_UI } from "./uiMeta.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import { StoryDialog } from "../../ui/primitives/Dialog.jsx";
import { ProgressBar } from "../../ui/primitives/ActionCard.jsx";
import type { GameState, Dispatch } from "../../types/state.js";
import type { BossState } from "./slice.js";

export const modalKey = "boss";
export const alwaysMounted = true;

function bossPortraitKey(boss: BossState | null | undefined): string | null {
  if (!boss) return null;
  const k = `boss_${boss.key || boss.id}`;
  return hasIcon(k) ? k : null;
}

interface GlyphProps { size?: number }

function WarningGlyph({ size = 14 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L22 20 H2 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10 V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

interface BossModalProps {
  boss: BossState;
  year?: number;
  dispatch: Dispatch;
}

function BossModal({ boss, year = 1, dispatch }: BossModalProps) {
  const meta = BOSS_UI[boss.key] ?? {};
  const pct = boss.targetCount > 0
    ? Math.min(100, Math.round((boss.progress / boss.targetCount) * 100))
    : 0;
  const closable = !boss.isKeeperTrial;

  return (
    <StoryDialog
      open
      onClose={closable ? () => dispatch({ type: "BOSS/REJECT" }) : undefined}
      closeOnBackdrop={closable}
      size="lg"
      ariaLabel={boss.name || "Boss encounter"}
      backdropClassName="z-50 !bg-black/70"
      className="!border-[4px] !border-[var(--flame-frame)]"
    >
      <StoryDialog.Body className="!p-5">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-4">
          {bossPortraitKey(boss) ? (
            <div style={{
              width: 96, height: 96, borderRadius: "50%", overflow: "hidden",
              border: "3px solid var(--flame)", boxShadow: "0 0 22px rgba(255,122,0,0.45)",
              marginBottom: 4, background: "rgba(0,0,0,0.35)",
            }}>
              <IconCanvas iconKey={bossPortraitKey(boss) ?? ""} size={96} />
            </div>
          ) : (
            <div className="text-[48px] leading-none mb-1">{boss.emoji}</div>
          )}
          <div
            className="text-[20px] font-bold text-center leading-tight"
            style={{ color: "var(--flame)" }}
          >
            {boss.name}
          </div>
          <div className="text-caption text-white/70 text-center italic mt-1 px-2">
            {boss.flavor || meta.flavor}
          </div>
          {boss.description && (
            <div className="text-micro text-white/60 text-center mt-2 px-3 leading-snug">
              {boss.description}
            </div>
          )}
        </div>

        {/* Board modifier panel */}
        {boss.modifierDescription && (
          <div
            className="rounded-xl p-3 mb-4 flex items-start gap-2"
            style={{ background: "rgba(var(--flame-rust-rgb),0.18)", border: "1px solid rgba(var(--flame-rust-rgb),0.4)" }}
          >
            <span className="flex-shrink-0 text-[var(--flame-warm)]"><WarningGlyph size={14} /></span>
            <div className="text-micro text-[var(--flame-warm)] leading-snug">
              <span className="font-bold">Board effect: </span>{boss.modifierDescription}
            </div>
          </div>
        )}

        {/* Goal panel */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(var(--flame-rust-rgb),0.5)" }}
        >
          <div
            className="text-[13px] font-bold text-center mb-3 leading-snug"
            style={{ color: "var(--cream)" }}
          >
            {boss.goal}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-micro text-white/60">
              Progress
            </span>
            <span className="text-[13px] font-bold" style={{ color: "var(--flame)" }}>
              {boss.progress} / {boss.targetCount}
            </span>
          </div>
          <ProgressBar value={boss.progress} max={boss.targetCount} color="var(--flame)" />

          <div className="flex justify-between mt-3">
            <span className="text-micro text-white/50">
              {pct}% complete
            </span>
            <span
              className="text-caption font-bold"
              style={{ color: boss.turnsLeft <= 1 ? "var(--flame-alert)" : "var(--cream)" }}
            >
              {boss.turnsLeft} turn{boss.turnsLeft !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>

        {/* Reward hint — show actual year-scaled estimate */}
        <div className="text-micro text-center text-white/50 mb-4">
          Victory reward: +{200 * year}◉ (Year {year})
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => dispatch({ type: "BOSS/CLOSE" })}
            className="w-full py-3 rounded-xl font-bold text-body-lg transition-colors"
            style={{
              background: "linear-gradient(to bottom, var(--flame-cta-top), var(--flame-cta-bot))",
              border: "2px solid var(--flame-cta-edge)",
              color: "white",
              letterSpacing: "0.05em",
            }}
          >
            ACCEPT THE CHALLENGE
          </button>
          {!boss.isKeeperTrial && (
            <button
              onClick={() => dispatch({ type: "BOSS/REJECT" })}
              className="w-full py-2 rounded-xl font-bold text-caption transition-colors"
              style={{
                background: "transparent",
                border: "1px solid rgba(var(--flame-rust-rgb),0.6)",
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.05em",
              }}
            >
              DECLINE
            </button>
          )}
        </div>
      </StoryDialog.Body>
    </StoryDialog>
  );
}

interface BossFeatureProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function BossFeature({ state, dispatch }: BossFeatureProps) {
  const s = state as GameState & { boss?: BossState | null; bossMinimized?: boolean; year?: number; _bossSeasonCount?: number; modal?: string | null };
  const { boss, bossMinimized } = s;
  const year = s.year ?? Math.max(1, Math.ceil(((s._bossSeasonCount ?? 0) / 4)));

  if (!boss) return null;

  if (bossMinimized) {
    return null;
  }

  // Only show the blocking full modal when modal === 'boss' (board is locked)
  if (s.modal !== "boss") return null;

  return <BossModal boss={boss} year={year} dispatch={dispatch} />;
}
