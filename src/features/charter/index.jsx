import { useMemo, useState } from "react";
import Screen from "../../ui/primitives/Screen.jsx";
import Pill from "../../ui/primitives/Pill.jsx";
import Button from "../../ui/primitives/Button.jsx";
import Icon from "../../ui/Icon.jsx";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import { findBeat, beatChoices } from "../../story.js";

export const viewKey = "charter";

const PACT_TERMS = [
  {
    id: "found_first",
    roman: "I",
    title: "Found before you spend",
    description: "Every settlement is founded at the home hearth before its bounty is spent abroad.",
    relatedBeats: ["act1_arrival", "act1_first_harvest", "act1_light_hearth"],
    honoredFlags: ["intro_seen"],
    violationFlags: [],
  },
  {
    id: "audit_embers",
    roman: "II",
    title: "Audit the embers",
    description: "What burns in the hearth is counted, and what is counted is remembered.",
    relatedBeats: ["act1_build_granary", "act3_caravan"],
    honoredFlags: [],
    violationFlags: [],
  },
  {
    id: "three_names",
    roman: "III",
    title: "Three names, three roads",
    description: "Three settlements named in your hand before the capital is called.",
    relatedBeats: ["act2_bram_arrives", "act2_liss_arrives", "act3_mine_found"],
    honoredFlags: [],
    violationFlags: [],
  },
  {
    id: "no_empty_hearths",
    roman: "IV",
    title: "No empty hearths",
    description: "No lot abandoned, no hearth left cold once it has been lit.",
    relatedBeats: ["act1_light_hearth", "act1_first_order"],
    honoredFlags: [],
    violationFlags: [],
  },
  {
    id: "drive_out_bite",
    roman: "V",
    title: "Drive out only what bites",
    description: "A keeper may be driven out only after it has harmed a settler. Every drive-out adds a mark to this term unless the keeper has bitten first.",
    relatedBeats: ["act1_keeper_trial", "act2_frostmaw", "frostmaw_keeper"],
    honoredFlags: ["keeper_path_coexist"],
    violationFlags: ["keeper_path_driveout"],
  },
  {
    id: "capital_last",
    roman: "VI",
    title: "The capital is the last",
    description: "The old capital opens only when three settlements have stood. Three tokens, three roads, then the gate.",
    relatedBeats: ["act3_festival", "act3_win"],
    honoredFlags: [],
    violationFlags: [],
  },
];

function termRelatedEntries(term, choiceLog) {
  const set = new Set(term.relatedBeats);
  return choiceLog.filter((e) => set.has(e.beatId));
}

function deriveTermState(term, choiceLog, flags) {
  if (term.violationFlags.some((f) => flags[f])) return "violated";
  const entries = termRelatedEntries(term, choiceLog);
  if (term.honoredFlags.some((f) => flags[f])) return "honored";
  if (entries.length > 0) return "honored";
  return "pending";
}

function termCaption(term, choiceLog, flags) {
  const entries = termRelatedEntries(term, choiceLog);
  const state = deriveTermState(term, choiceLog, flags);
  if (state === "violated") return `Violated — ${entries.length || 1} recorded mark${entries.length === 1 ? "" : "s"}`;
  if (state === "honored") return `Honored across ${entries.length || 1} choice${entries.length === 1 ? "" : "s"}`;
  return "Awaiting your hand";
}

function statePillTone(state) {
  if (state === "honored") return "moss";
  if (state === "violated") return "rose";
  return "iron";
}

function statePillLabel(state) {
  if (state === "honored") return "honored";
  if (state === "violated") return "violated";
  return "pending";
}

function formatChoiceEntry(entry) {
  const beat = findBeat(entry.beatId);
  if (!beat) {
    return {
      title: entry.beatId,
      choiceLabel: entry.choiceId,
      act: null,
      ts: entry.ts,
      value: entry.value,
    };
  }
  const choice = beatChoices(beat).find((c) => c.id === entry.choiceId);
  return {
    title: beat.title || entry.beatId,
    choiceLabel: choice?.label || entry.choiceId,
    act: beat.act,
    ts: entry.ts,
    value: entry.value,
  };
}

function formatTimestamp(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function TermCard({ term, choiceLog, flags, onOpen }) {
  const state = deriveTermState(term, choiceLog, flags);
  const tone = statePillTone(state);
  const label = statePillLabel(state);
  const caption = termCaption(term, choiceLog, flags);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-bg-darker/70 border border-panel-edge rounded-lg p-3 flex items-start gap-3 hover:bg-bg-darker transition-colors"
    >
      <span className="text-h3 font-bold text-gold-soft tabular-nums w-8 text-right flex-shrink-0">{term.roman}.</span>
      <span className="flex-1 min-w-0">
        <span className="block text-body-lg font-semibold text-cream truncate">{term.title}</span>
        <span className="block text-caption text-cream-soft mt-1">{caption}</span>
      </span>
      <Pill tone={tone} size="sm">{label}</Pill>
    </button>
  );
}

function TermDialog({ term, choiceLog, flags, onClose }) {
  if (!term) return null;
  const entries = termRelatedEntries(term, choiceLog);
  const state = deriveTermState(term, choiceLog, flags);
  return (
    <ParchmentDialog open onClose={onClose} size="md">
      <ParchmentDialog.Title>
        <span className="block text-caption uppercase tracking-wide text-ink-soft/70">Term {term.roman}</span>
        <span className="block">{term.title}</span>
      </ParchmentDialog.Title>
      <ParchmentDialog.Body>
        <div className="flex items-center gap-2 mb-3">
          <Pill tone={statePillTone(state)} size="sm">{statePillLabel(state)}</Pill>
        </div>
        <p className="text-body leading-relaxed text-ink mb-4">{term.description}</p>
        <div className="text-caption uppercase tracking-wide text-ink-soft/70 mb-2">Where it was tested</div>
        {entries.length === 0 ? (
          <p className="text-body text-ink-soft italic">
            No choices recorded against this term yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((e, i) => {
              const f = formatChoiceEntry(e);
              return (
                <li key={`${e.beatId}-${e.choiceId}-${e.ts ?? i}`} className="border-l-2 border-iron-edge pl-3 py-1">
                  <div className="text-body font-semibold text-ink">{f.title}</div>
                  <div className="text-caption text-ink-soft">{f.choiceLabel}</div>
                  {f.ts && (
                    <div className="text-micro text-ink-soft/70 tabular-nums mt-1">{formatTimestamp(f.ts)}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="iron" variant="outline" onClick={onClose}>Close</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <Pill
      tone={active ? "gold" : "iron"}
      variant={active ? "solid" : "outline"}
      size="sm"
      interactive
      onClick={onClick}
    >
      {children}
    </Pill>
  );
}

function SettlementRibbon({ name, dayCount }) {
  return (
    <div className="flex items-center gap-3 bg-bg-darker/70 border border-panel-edge rounded-lg px-4 py-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gold-soft/20 border border-gold-soft/40 grid place-items-center flex-shrink-0">
        <Icon iconKey="ui_star" size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body-lg font-semibold text-cream truncate">{name}</div>
        <div className="text-caption text-cream-soft tabular-nums">{dayCount} turn{dayCount === 1 ? "" : "s"} elapsed</div>
      </div>
      <div className="text-micro uppercase tracking-wide text-cream-soft">Hollow Pact</div>
    </div>
  );
}

function TimelineRow({ entry }) {
  const f = formatChoiceEntry(entry);
  return (
    <li className="relative pl-6 py-2 border-l-2 border-panel-edge">
      <span className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-gold-soft" />
      <div className="flex items-baseline gap-2">
        <span className="text-body font-semibold text-cream">{f.title}</span>
        {f.act != null && (
          <span className="text-micro uppercase tracking-wide text-cream-soft">Act {f.act}</span>
        )}
      </div>
      <div className="text-caption text-cream-soft mt-1">{f.choiceLabel}</div>
      {f.value && (
        <div className="text-caption text-cream-soft italic mt-1">"{String(f.value)}"</div>
      )}
      {f.ts && (
        <div className="text-micro text-cream-soft/70 tabular-nums mt-1">{formatTimestamp(f.ts)}</div>
      )}
    </li>
  );
}

export default function Charter({ state, dispatch }) {
  const [tab, setTab] = useState("terms");
  const [openTermId, setOpenTermId] = useState(null);

  const flags = state?.story?.flags ?? {};
  const settlementName = state?.settlement?.name ?? "Hearthwood Vale";
  const dayCount = state?.turnsUsed ?? 0;

  const sortedLog = useMemo(() => {
    const log = state?.story?.choiceLog ?? [];
    return [...log].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  }, [state?.story?.choiceLog]);

  const openTerm = PACT_TERMS.find((t) => t.id === openTermId) || null;

  const onBack = () => dispatch({ type: "SET_VIEW", view: "chronicle" });

  return (
    <Screen title="The Charter" onBack={onBack} tone="dark">
      <Screen.Filters>
        <FilterChip active={tab === "terms"} onClick={() => setTab("terms")}>Terms</FilterChip>
        <FilterChip active={tab === "all"} onClick={() => setTab("all")}>All choices</FilterChip>
      </Screen.Filters>
      <Screen.Body>
        <SettlementRibbon name={settlementName} dayCount={dayCount} />
        {tab === "terms" ? (
          <>
            <div className="flex flex-col gap-2">
              {PACT_TERMS.map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  choiceLog={sortedLog}
                  flags={flags}
                  onOpen={() => setOpenTermId(term.id)}
                />
              ))}
            </div>
            <p className="text-caption text-cream-soft italic leading-relaxed mt-6">
              Six terms, sworn at the home hearth. Read by the Ember at the close of the age.
              Each choice you make is weighed against them.
            </p>
          </>
        ) : sortedLog.length === 0 ? (
          <div className="text-center py-12 text-cream-soft italic">
            Your choices will be recorded here as the pact unfolds.
          </div>
        ) : (
          <ul className="flex flex-col gap-0">
            {sortedLog.map((e, i) => (
              <TimelineRow key={`${e.beatId}-${e.choiceId}-${e.ts ?? i}`} entry={e} />
            ))}
          </ul>
        )}
      </Screen.Body>
      <TermDialog
        term={openTerm}
        choiceLog={sortedLog}
        flags={flags}
        onClose={() => setOpenTermId(null)}
      />
    </Screen>
  );
}

export { PACT_TERMS };
