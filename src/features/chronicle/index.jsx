import Icon from "../../ui/Icon.jsx";
import { STORY_BEATS } from "../../story.js";

export const viewKey = "chronicle";

export default function Chronicle({ state, dispatch }) {
  const { flags = {} } = state.story || {};
  
  // Combine completed beats and choiceLog into a single timeline
  // We identify a beat as "completed" if its onComplete flag is set.
  const completedBeats = STORY_BEATS.filter(b => {
    if (!b.onComplete) return false;
    const flag = b.onComplete.setFlag;
    if (Array.isArray(flag)) return flag.some(f => flags[f]);
    return flags[flag];
  });

  return (
    <div className="hl-panel">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 transform rotate-12">
          <Icon iconKey="ui_clipboard" size={400} />
        </div>
      </div>

      <div className="hl-panel-header relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Icon iconKey="ui_clipboard" size={24} className="text-[#d6612a]" />
          <h1 className="hl-panel-title font-serif tracking-tight">Chronicle of the Vale</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => dispatch({ type: "SET_VIEW", view: "charter" })}
            className="hl-tab"
            title="View Charter"
          >
            View Charter
          </button>
          <button
            onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
            className="hl-panel-close"
            title="Return to Town"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="hl-panel-body relative z-10">
        {completedBeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Icon iconKey="ui_star" size={48} className="mb-4 opacity-30" />
            <p className="hl-empty">The pages are still blank. Your journey has just begun.</p>
            <p className="text-xs mt-2 text-on-panel-faint">Complete story beats to record your legacy here.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[var(--panel-divider)] ml-4 pl-8 flex flex-col gap-10 py-4">
            {completedBeats.map((beat, i) => {
              const dateStr = `Act ${beat.act || 1}`;
              return (
                <div key={beat.id} className="relative group animate-fadeIn" style={{ animationDelay: `${i * 100}ms` }}>
                  {/* Timeline Dot */}
                  <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[var(--card-bg)] border-2 border-[#d6612a] flex items-center justify-center shadow-[0_0_10px_rgba(214,97,42,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-[#d6612a]" />
                  </div>

                  <div className="hl-section-label mb-1 tracking-[0.2em]">{dateStr}</div>
                  <h2 className="text-lg font-bold text-on-panel mb-2 font-serif transition-colors">{beat.title}</h2>

                  <div className="hl-card p-4 text-sm leading-relaxed relative overflow-hidden">
                    <p className="relative z-10 italic text-on-panel-dim leading-relaxed">
                      {beat.body || (beat.lines && beat.lines[0]?.text) || "A chapter was written in the history of the Vale."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 pb-3 px-3 border-t border-[var(--panel-divider)] text-center relative z-10 flex-shrink-0">
        <p className="text-[10px] text-on-panel-faint font-bold uppercase tracking-widest italic">
          — The record of your impact —
        </p>
      </div>
    </div>
  );
}
