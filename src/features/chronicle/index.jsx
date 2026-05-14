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
    <div className="flex flex-col h-full bg-[#1a1410] text-[#f8e7c6] p-4 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 transform rotate-12">
          <Icon iconKey="ui_clipboard" size={400} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-[#e2c19b]/30 pb-3 mb-4 relative z-10">
        <Icon iconKey="ui_clipboard" size={24} className="text-[#d6612a]" />
        <h1 className="text-xl font-bold font-serif tracking-tight">Chronicle of the Vale</h1>
        <button 
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="ml-auto bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors group"
          title="Return to Town"
        >
          <Icon iconKey="ui_cancel" size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {completedBeats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 italic text-center px-8">
            <Icon iconKey="ui_star" size={48} className="mb-4 opacity-20" />
            <p>The pages are still blank. Your journey has just begun.</p>
            <p className="text-xs mt-2">Complete story beats to record your legacy here.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[#e2c19b]/15 ml-4 pl-8 flex flex-col gap-10 py-4">
            {completedBeats.map((beat, i) => {
              const dateStr = `Act ${beat.act || 1}`;
              return (
                <div key={beat.id} className="relative group animate-fadeIn" style={{ animationDelay: `${i * 100}ms` }}>
                  {/* Timeline Dot */}
                  <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[#1a1410] border-2 border-[#d6612a] flex items-center justify-center shadow-[0_0_10px_rgba(214,97,42,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-[#d6612a]" />
                  </div>
                  
                  <div className="text-[10px] font-bold text-[#d6612a] uppercase tracking-[0.2em] mb-1 opacity-80">{dateStr}</div>
                  <h2 className="text-lg font-bold text-white mb-2 font-serif group-hover:text-[#ffd248] transition-colors">{beat.title}</h2>
                  
                  <div className="bg-[#2b2218]/80 backdrop-blur-sm border border-[#e2c19b]/10 rounded-xl p-4 text-sm leading-relaxed text-[#f8e7c6]/90 shadow-xl relative overflow-hidden">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 opacity-10">
                      <div className="absolute top-0 right-0 border-t-[16px] border-r-[16px] border-t-[#e2c19b] border-r-transparent rotate-180" />
                    </div>
                    
                    <p className="relative z-10 italic opacity-80 leading-relaxed">
                      {beat.body || (beat.lines && beat.lines[0]?.text) || "A chapter was written in the history of the Vale."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-[#e2c19b]/10 text-center relative z-10">
        <p className="text-[10px] text-[#e2c19b]/40 font-bold uppercase tracking-widest italic">
          — The record of your impact —
        </p>
      </div>
    </div>
  );
}
