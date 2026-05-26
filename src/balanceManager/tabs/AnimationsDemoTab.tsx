import { useRef } from "react";
import { BOARD_ANIMATIONS } from "../../config/boardAnimations.js";
import { COLORS, Card, Pill, SmallButton, hexToCss } from "../shared.jsx";

interface SamplePlay {
  label: string;
  tint: number | null;
  pattern: string;
}

const SAMPLE_PLAYS: Record<string, SamplePlay[]> = {
  sweep: [
    { label: "Clear (no tint)", tint: null, pattern: "random6" },
    { label: "Magic Wand", tint: 0xa070ff, pattern: "all" },
    { label: "Rake", tint: 0x88ff88, pattern: "random6" },
    { label: "Axe (row)", tint: 0xff9900, pattern: "row" },
    { label: "Bomb (3×3)", tint: 0xff4444, pattern: "bomb3x3" },
    { label: "Rune Wildcard", tint: 0xffd248, pattern: "all" },
  ],
  popIn: [
    { label: "Seedpack", tint: 0x88ff88, pattern: "random6" },
  ],
  goldenFlash: [
    { label: "Lockbox", tint: 0xffd248, pattern: "random6" },
  ],
};

function TintSwatch({ tint }: { tint: number | null }) {
  const empty = tint == null;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 9999,
        border: `1px solid ${COLORS.border}`,
        background: empty
          ? `repeating-linear-gradient(45deg, ${COLORS.parchmentDeep} 0 2px, ${COLORS.parchment} 2px 4px)`
          : hexToCss(tint),
        verticalAlign: "middle",
      }}
    />
  );
}

export default function AnimationsDemoTab() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const postPlay = (name: string, tint: number | null, pattern: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "HEARTH_PLAY_ANIMATION", name, tint, pattern },
      "*"
    );
  };

  const resetBoard = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "HEARTH_RELOAD_SCENARIO" },
      "*"
    );
  };

  const iframeSrc = `${import.meta.env.BASE_URL}?visual=board-anim-demo&visualPanel=0`;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <SmallButton onClick={resetBoard} variant="primary">↻ Reset board</SmallButton>
          <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
            Live preview of every named board animation. Click a Play button to fire it on the
            iframed game board. Timing comes from <code>src/config/boardAnimations.js</code>.
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Animations demo game board"
          style={{
            width: "100%",
            maxWidth: 720,
            height: 720,
            border: `2px solid ${COLORS.border}`,
            borderRadius: 8,
            background: COLORS.parchmentDeep,
          }}
        />
      </div>

      {Object.entries(BOARD_ANIMATIONS).map(([name, entry]) => {
        const plays = SAMPLE_PLAYS[name] ?? [];
        // Each animation entry has a different shape per kind; widen to a
        // loose record so we can read optional timing fields with `in`-checks.
        const e = entry as unknown as Record<string, number | string | undefined>;
        return (
          <Card key={name}>
            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
              <div className="text-[14px] font-bold" style={{ color: COLORS.ember }}>{name}</div>
              <div className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>{String(e.kind)}</div>
            </div>

            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {Number.isFinite(e.duration) && <Pill>duration: {e.duration}ms</Pill>}
              {Number.isFinite(e.staggerMs) && <Pill>stagger: {e.staggerMs}ms</Pill>}
              {Number.isFinite(e.settleMs) && <Pill>settle: {e.settleMs}ms</Pill>}
              {Number.isFinite(e.rotationHalfDeg) && <Pill>rotation: ±{e.rotationHalfDeg}°</Pill>}
              {e.ease && <Pill>ease: {e.ease}</Pill>}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {plays.length === 0 && (
                <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                  No sample plays defined.
                </div>
              )}
              {plays.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <TintSwatch tint={p.tint} />
                  <SmallButton onClick={() => postPlay(name, p.tint, p.pattern)}>
                    ▶ {p.label}
                  </SmallButton>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
