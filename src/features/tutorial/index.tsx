import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NPCS } from '../../constants.js';
import Button from '../../ui/primitives/Button.jsx';
import { ParchmentDialog } from '../../ui/primitives/Dialog.jsx';
import { UI_COLORS } from '../../ui/primitives/palette.js';
import { STEPS, type WizardStep } from './steps.js';
import type { GameState, Dispatch } from '../../types/state.js';

export const modalKey = 'tutorial';
export const alwaysMounted = true;

const TUTORIAL_COLORS = {
  parchment: UI_COLORS.parchment,
  parchmentDeep: UI_COLORS.parchmentDeep,
  border: UI_COLORS.border,
  ink: UI_COLORS.ink,
  inkLight: UI_COLORS.inkLight,
  dotIdle: UI_COLORS.canvasRule,
  moss: 'var(--moss)',
};

// ─── Shared pieces ──────────────────────────────────────────────────────────

interface NpcDef { look?: { color?: string }; name: string }
function NpcAvatar({ npcKey, size = 36 }: { npcKey: string; size?: number }) {
  const npcs = NPCS as Record<string, NpcDef>;
  const npc: NpcDef = npcs[npcKey] || npcs.wren;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: npc.look?.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: size * 0.45,
        flexShrink: 0,
        border: `2px solid ${TUTORIAL_COLORS.border}`,
      }}
    >
      {npc.name[0]}
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i === step ? TUTORIAL_COLORS.moss : TUTORIAL_COLORS.dotIdle,
          }}
        />
      ))}
    </div>
  );
}

interface NavProps {
  step: number;
  total: number;
  cta: string;
  dispatch: Dispatch;
}

function CardNav({ step, total, cta, dispatch }: NavProps) {
  const canGoBack = step > 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <Button tone="iron" variant="soft" size="sm" onClick={() => dispatch({ type: 'TUTORIAL/SKIP' })}>
        Skip
      </Button>
      <StepDots step={step} total={total} />
      <div className="flex gap-2">
        {canGoBack && (
          <Button
            tone="iron"
            variant="soft"
            size="sm"
            onClick={() => dispatch({ type: 'TUTORIAL/PREV' })}
            aria-label="Previous step"
          >
            ←
          </Button>
        )}
        <Button tone="moss" size="sm" onClick={() => dispatch({ type: 'TUTORIAL/NEXT' })}>
          {cta} →
        </Button>
      </div>
    </div>
  );
}

// ─── Centered card (welcome / finish / spotlight fallback) ──────────────────

function CenterCard({ step, stepData, dispatch }: { step: number; stepData: WizardStep; dispatch: Dispatch }) {
  return (
    <ParchmentDialog
      open
      onClose={() => dispatch({ type: 'TUTORIAL/SKIP' })}
      size="md"
      ariaLabel={stepData.title}
      backdropClassName="z-[60] !bg-black/45"
    >
      <ParchmentDialog.Title className="!pb-2">
        <span className="flex items-center gap-3">
          <NpcAvatar npcKey={stepData.npc} size={44} />
          <span>{stepData.title}</span>
        </span>
      </ParchmentDialog.Title>

      <ParchmentDialog.Body className="!pt-0 !pb-3">
        <div className="text-body-lg leading-relaxed text-ink-soft">{stepData.body}</div>
      </ParchmentDialog.Body>

      <ParchmentDialog.Actions className="!block">
        <CardNav step={step} total={STEPS.length} cta={stepData.cta} dispatch={dispatch} />
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}

// ─── Spotlight (dim everything but the highlighted element) ──────────────────

interface Rect { top: number; left: number; width: number; height: number }

const SPOTLIGHT_PAD = 8;

function SpotlightCard({ step, stepData, rect, dispatch }: { step: number; stepData: WizardStep; rect: Rect; dispatch: Dispatch }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
  const hole = {
    top: rect.top - SPOTLIGHT_PAD,
    left: rect.left - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };

  const holeRight = hole.left + hole.width;
  const holeBottom = hole.top + hole.height;

  // Place the coach card in whichever margin around the target has room. The
  // landscape board is nearly full-height, so a top/bottom-only strategy would
  // shove the card off-screen — preferring the widest side gap keeps it visible.
  const cardW = Math.min(320, vw - 24);
  const CARD_H = 200;
  const gap = { top: hole.top, bottom: vh - holeBottom, left: hole.left, right: vw - holeRight };
  const fits = {
    top: gap.top >= CARD_H + 16,
    bottom: gap.bottom >= CARD_H + 16,
    left: gap.left >= cardW + 16,
    right: gap.right >= cardW + 16,
  };
  const pref = stepData.placement === 'top' ? 'top' : 'bottom';
  const order: Array<keyof typeof fits> =
    pref === 'top' ? ['top', 'bottom', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  const place = order.find((p) => fits[p]) ?? 'center';

  const clampX = (x: number) => Math.max(12, Math.min(x, vw - cardW - 12));
  const clampY = (y: number) => Math.max(12, Math.min(y, vh - CARD_H - 12));
  const midX = clampX(rect.left + rect.width / 2 - cardW / 2);
  const midY = clampY(rect.top + rect.height / 2 - CARD_H / 2);
  const cardPos: React.CSSProperties =
    place === 'top' ? { left: midX, bottom: vh - hole.top + 12 }
    : place === 'bottom' ? { left: midX, top: holeBottom + 12 }
    : place === 'left' ? { top: midY, right: vw - hole.left + 12 }
    : place === 'right' ? { top: midY, left: holeRight + 12 }
    : { left: clampX(vw / 2 - cardW / 2), bottom: 16 };

  // Portal to <body> so the fixed-position overlay escapes the app-shell's
  // transformed / overflow-hidden containing block, and so the solid dim panels
  // composite above the app on every viewport.
  const content = (
    <>
      <style>{`
        @keyframes hwvTourRing {
          0%, 100% { box-shadow: 0 0 0 3px var(--moss), 0 0 0 8px rgba(95,107,58,0.35); }
          50% { box-shadow: 0 0 0 3px var(--moss), 0 0 0 14px rgba(95,107,58,0.12); }
        }
        @keyframes hwvTourHint { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Four solid dim panels framing the cut-out hole. Solid fills (rather
          than a giant box-shadow, which headless renderers drop) keep the dim
          reliable. Non-blocking by design: the hole stays interactive so the
          player can drag the board / tap the highlighted control. */}
      {([
        { top: 0, left: 0, width: vw, height: Math.max(0, hole.top) },
        { top: holeBottom, left: 0, width: vw, height: Math.max(0, vh - holeBottom) },
        { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },
        { top: hole.top, left: holeRight, width: Math.max(0, vw - holeRight), height: hole.height },
      ] as const).map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{ position: 'fixed', background: 'rgba(20,14,6,0.55)', pointerEvents: 'none', zIndex: 60, ...p }}
        />
      ))}

      {/* Pulsing highlight ring around the target (non-interactive). */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: 12,
          pointerEvents: 'none',
          zIndex: 61,
          animation: 'hwvTourRing 1.6s ease-in-out infinite',
        }}
      />

      {/* Coach card floating beside the target. */}
      <div
        role="dialog"
        aria-label={stepData.title}
        style={{
          position: 'fixed',
          width: cardW,
          zIndex: 62,
          pointerEvents: 'auto',
          background: TUTORIAL_COLORS.parchment,
          border: `3px solid ${TUTORIAL_COLORS.border}`,
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 8px 28px rgba(0,0,0,0.38)',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          ...cardPos,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NpcAvatar npcKey={stepData.npc} size={34} />
          <div style={{ fontWeight: 700, fontSize: 15, color: TUTORIAL_COLORS.ink }}>{stepData.title}</div>
        </div>

        <div style={{ fontSize: 13.5, color: TUTORIAL_COLORS.inkLight, lineHeight: 1.5 }}>{stepData.body}</div>

        {stepData.hint && (
          <div
            style={{
              fontSize: 12.5,
              color: TUTORIAL_COLORS.moss,
              fontWeight: 700,
              animation: 'hwvTourHint 1.4s ease-in-out infinite',
            }}
          >
            {stepData.hint}
          </div>
        )}

        <CardNav step={step} total={STEPS.length} cta={stepData.cta} dispatch={dispatch} />
      </div>
    </>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

// ─── Target measurement ─────────────────────────────────────────────────────

function readRect(selector: string): Rect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function useTargetRect(selector: string | null, deps: ReadonlyArray<unknown>): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let tries = 0;
    const apply = (r: Rect | null) => { if (!cancelled) setRect(r); };

    // The target view may have just been switched to; retry across a few
    // animation frames until the element lays out, then give up (the caller
    // falls back to a centered card).
    const find = () => {
      if (cancelled) return;
      if (!selector) { apply(null); return; }
      const r = readRect(selector);
      if (r) { apply(r); return; }
      if (tries++ < 40) raf = requestAnimationFrame(find);
      else apply(null);
    };
    find();

    if (!selector) return () => { cancelled = true; };

    const onChange = () => {
      const r = readRect(selector);
      if (r) apply(r);
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are forwarded explicitly so the rect re-measures on step / view change
  }, [selector, ...deps]);

  return rect;
}

// ─── Root ───────────────────────────────────────────────────────────────────

interface TutorialProps { state: GameState; dispatch: Dispatch }

export default function Tutorial({ state, dispatch }: TutorialProps) {
  const s = state as GameState & {
    tutorial?: { active?: boolean; step?: number };
    story?: { queuedBeat?: unknown };
    modal?: string | null;
    view?: string;
  };
  const tut = s.tutorial;
  const active = !!tut?.active;
  const step = Math.min(tut?.step ?? 0, STEPS.length - 1);
  const stepData: WizardStep | undefined = STEPS[step];

  // Navigate to the step's view once, on entry — never yank the player back if
  // they wander, so the tour stays guiding rather than imprisoning.
  const navStepRef = useRef(-1);
  useEffect(() => {
    if (!active) {
      navStepRef.current = -1;
      return;
    }
    if (navStepRef.current === step) return;
    navStepRef.current = step;
    const view = stepData?.view;
    if (view && view !== s.view) dispatch({ type: 'SET_VIEW', view });
  }, [active, step, stepData, s.view, dispatch]);

  const wantSpotlight = active && !!stepData && !stepData.blocking && !!stepData.target;
  const rect = useTargetRect(wantSpotlight ? (stepData?.target ?? null) : null, [step, s.view, active]);

  // Hide while a story beat is queued (it must be clickable above us) or while a
  // different modal owns the screen.
  if (s.story?.queuedBeat) return null;
  if (s.modal && s.modal !== 'tutorial') return null;
  if (!active || !stepData) return null;

  if (stepData.blocking || !rect) {
    return <CenterCard step={step} stepData={stepData} dispatch={dispatch} />;
  }
  return <SpotlightCard step={step} stepData={stepData} rect={rect} dispatch={dispatch} />;
}
