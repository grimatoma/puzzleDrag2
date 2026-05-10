import { NPCS } from '../../constants.js';

export const modalKey = 'tutorial';
export const alwaysMounted = true;

const STEPS = [
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

function NpcAvatar({ npcKey, size = 36 }) {
  const npc = NPCS[npcKey] || NPCS.wren;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: npc.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: size * 0.45,
        flexShrink: 0,
        border: '2px solid #b28b62',
      }}
    >
      {npc.name[0]}
    </div>
  );
}

function StepDots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i === step ? '#91bf24' : '#c8b99a',
          }}
        />
      ))}
    </div>
  );
}

function CenterCard({ step, stepData, dispatch }) {
  const canGoBack = step > 0;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 60,
      }}
    >
      <div
        style={{
          background: '#f4ecd8',
          border: '4px solid #b28b62',
          borderRadius: 20,
          padding: 20,
          maxWidth: 480,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minWidth: 300,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NpcAvatar npcKey={stepData.npc} size={44} />
          <div id="tutorial-title" style={{ fontWeight: 700, fontSize: 17, color: '#3e2a1a' }}>{stepData.title}</div>
        </div>

        <div style={{ fontSize: 14, color: '#5a3e28', lineHeight: 1.55 }}>{stepData.body}</div>

        <StepDots step={step} total={STEPS.length} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <button
            onClick={() => dispatch({ type: 'TUTORIAL/SKIP' })}
            style={{
              background: '#e8dcc4',
              border: '2px solid #b28b62',
              borderRadius: 10,
              color: '#5a3a20',
              fontFamily: 'Arial, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '10px 14px',
              minHeight: 40,
            }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {canGoBack && (
              <button
                onClick={() => dispatch({ type: 'TUTORIAL/PREV' })}
                aria-label="Previous step"
                style={{
                  background: '#e8dcc4',
                  border: '2px solid #b28b62',
                  borderRadius: 10,
                  color: '#5a3a20',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '10px 14px',
                  minHeight: 40,
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'TUTORIAL/NEXT' })}
              style={{
                background: '#91bf24',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                padding: '10px 20px',
                minHeight: 40,
              }}
            >
              {stepData.cta} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerToast({ step, stepData, dispatch }) {
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
          background: '#f4ecd8',
          border: '3px solid #b28b62',
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
            <div style={{ fontWeight: 700, fontSize: 13, color: '#3e2a1a' }}>{stepData.title}</div>
          </div>
          <button
            onClick={() => dispatch({ type: 'TUTORIAL/SKIP' })}
            style={{
              background: '#e8dcc4',
              border: '2px solid #b28b62',
              borderRadius: 8,
              color: '#5a3a20',
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
            aria-label="Close tutorial"
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 13, color: '#5a3e28', lineHeight: 1.5 }}>{stepData.body}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              color: '#91bf24',
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

export default function Tutorial({ state, dispatch }) {
  const tut = state.tutorial;
  // Do not render while a story beat is queued — StoryModal must be clickable (fix #1)
  if (state.story?.queuedBeat) return null;
  // Do not render while any modal is open — modals must be clickable above this overlay
  if (state.modal) return null;
  if (!tut || !tut.active) return null;

  const step = Math.min(tut.step, STEPS.length - 1);
  const stepData = STEPS[step];

  if (stepData.anchor === 'corner') {
    return <CornerToast step={step} stepData={stepData} dispatch={dispatch} />;
  }

  return <CenterCard step={step} stepData={stepData} dispatch={dispatch} />;
}
