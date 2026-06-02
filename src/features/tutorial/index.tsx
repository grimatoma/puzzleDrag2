import { NPCS } from '../../constants.js';
import Button from '../../ui/primitives/Button.jsx';
import { ParchmentDialog } from '../../ui/primitives/Dialog.jsx';
import { UI_COLORS } from '../../ui/primitives/palette.js';
import type { ReactNode } from 'react';
import type { GameState, Dispatch } from '../../types/state.js';

interface StepDef {
  npc: string;
  title: string;
  body: string;
  cta: string;
  anchor: 'center' | 'corner';
}

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

const STEPS: StepDef[] = [
  {
    npc: 'wren',
    title: 'Welcome to Hearthwood Vale',
    body: "You're the new caretaker. Restore the vale — chain by chain, season by season.",
    cta: 'Begin',
    anchor: 'center',
  },
  {
    npc: 'wren',
    title: 'Drag chains',
    body: 'Touch and drag across 3+ matching tiles on the board. Lift to harvest.',
    cta: 'Try it',
    anchor: 'corner',
  },
  {
    npc: 'mira',
    title: 'Upgrades ★',
    body: 'Every 3rd tile in your chain upgrades to the next tier. Long chains snowball — try chains of 6+.',
    cta: 'Got it',
    anchor: 'center',
  },
  {
    npc: 'mira',
    title: 'Orders',
    body: 'Townsfolk leave standing orders. Gather what they need, then tap to deliver.',
    cta: 'Try it',
    anchor: 'corner',
  },
  {
    npc: 'bram',
    title: 'Town',
    body: 'Open ⌂ Town below to build mills, bakeries, and forges with your earnings.',
    cta: 'Open Town',
    anchor: 'corner',
  },
  {
    npc: 'wren',
    title: "You're ready",
    body: 'Seasons turn fast. Make every chain count.',
    cta: 'Begin',
    anchor: 'center',
  },
];

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
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i === step ? TUTORIAL_COLORS.moss : TUTORIAL_COLORS.dotIdle,
          }}
        />
      ))}
    </div>
  );
}

function CenterCard({ step, stepData, dispatch }: { step: number; stepData: StepDef; dispatch: Dispatch }) {
  const canGoBack = step > 0;
  return (
    <ParchmentDialog
      open
      onClose={() => dispatch({ type: 'TUTORIAL/SKIP' })}
      size="md"
      ariaLabel={stepData.title}
      backdropClassName="z-[60] !bg-black/40"
    >
      <ParchmentDialog.Title className="!pb-2">
        <span className="flex items-center gap-3">
          <NpcAvatar npcKey={stepData.npc} size={44} />
          <span>{stepData.title}</span>
        </span>
      </ParchmentDialog.Title>

      <ParchmentDialog.Body className="!pt-0 !pb-3 flex flex-col gap-3">
        <div className="text-body-lg leading-relaxed text-ink-soft">{stepData.body}</div>

        <StepDots step={step} total={STEPS.length} />
      </ParchmentDialog.Body>

      <ParchmentDialog.Actions className="!justify-between">
        <Button
          tone="iron"
          variant="soft"
          size="md"
          onClick={() => dispatch({ type: 'TUTORIAL/SKIP' })}
        >
          Skip
        </Button>
        <div className="flex gap-2">
          {canGoBack && (
            <Button
              tone="iron"
              variant="soft"
              size="md"
              onClick={() => dispatch({ type: 'TUTORIAL/PREV' })}
              aria-label="Previous step"
            >
              ← Back
            </Button>
          )}
          <Button
            tone="moss"
            size="md"
            onClick={() => dispatch({ type: 'TUTORIAL/NEXT' })}
          >
            {stepData.cta} →
          </Button>
        </div>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}

function CornerToastButton({ children, onClick, ariaLabel, primary = false }: { children: ReactNode; onClick?: () => void; ariaLabel?: string; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        background: primary ? TUTORIAL_COLORS.moss : TUTORIAL_COLORS.parchmentDeep,
        border: primary ? 'none' : `2px solid ${TUTORIAL_COLORS.border}`,
        borderRadius: 8,
        color: primary ? '#fff' : TUTORIAL_COLORS.inkLight,
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        lineHeight: 1,
        width: 32,
        height: 32,
        display: 'inline-grid',
        placeItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function CornerToast({ step, stepData, dispatch }: { step: number; stepData: StepDef; dispatch: Dispatch }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: 12,
        zIndex: 60,
        maxWidth: 260,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: TUTORIAL_COLORS.parchment,
          border: `3px solid ${TUTORIAL_COLORS.border}`,
          borderRadius: 16,
          padding: '12px 14px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NpcAvatar npcKey={stepData.npc} size={30} />
            <div style={{ fontWeight: 700, fontSize: 13, color: TUTORIAL_COLORS.ink }}>{stepData.title}</div>
          </div>
          <CornerToastButton
            onClick={() => dispatch({ type: 'TUTORIAL/SKIP' })}
            ariaLabel="Close tutorial"
          >
            ×
          </CornerToastButton>
        </div>

        <div style={{ fontSize: 13, color: TUTORIAL_COLORS.inkLight, lineHeight: 1.5 }}>{stepData.body}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: TUTORIAL_COLORS.moss,
              fontWeight: 700,
              animation: 'tutorialPulse 1.4s ease-in-out infinite',
            }}
          >
            👀 {stepData.cta}
          </div>
          <StepDots step={step} total={STEPS.length} />
        </div>

        <style>{`
          @keyframes tutorialPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}</style>
      </div>
    </div>
  );
}

interface TutorialProps { state: GameState; dispatch: Dispatch }

export default function Tutorial({ state, dispatch }: TutorialProps) {
  const s = state as GameState & { tutorial?: { active?: boolean; step?: number }; story?: { queuedBeat?: unknown }; modal?: string | null };
  const tut = s.tutorial;
  // Do not render while a story beat is queued — StoryModal must be clickable (fix #1)
  if (s.story?.queuedBeat) return null;
  // Do not render while any modal is open — modals must be clickable above this overlay
  if (s.modal) return null;
  if (!tut || !tut.active) return null;

  const step = Math.min(tut.step ?? 0, STEPS.length - 1);
  const stepData = STEPS[step];

  if (stepData.anchor === 'corner') {
    return <CornerToast step={step} stepData={stepData} dispatch={dispatch} />;
  }

  return <CenterCard step={step} stepData={stepData} dispatch={dispatch} />;
}
