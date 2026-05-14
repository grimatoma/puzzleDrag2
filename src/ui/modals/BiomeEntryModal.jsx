import { useState } from "react";
import { BIOMES, EXPEDITION_FOOD_TURNS, MIN_EXPEDITION_TURNS, ITEMS } from "../../constants.js";
import { expeditionTurnsForFood, expeditionTurnsFromSupply } from "../../features/zones/data.js";
import IconCanvas, { hasIcon } from "../IconCanvas.jsx";
import Icon from "../Icon.jsx";
import Stepper from "../primitives/Stepper.jsx";
import Button from "../primitives/Button.jsx";
import Banner from "../primitives/Banner.jsx";
import Pill from "../primitives/Pill.jsx";
import ResourceCell from "../primitives/ResourceCell.jsx";
import { ParchmentDialog } from "../primitives/Dialog.jsx";
import { FOOD_LABELS } from "../townData.js";

// Vol II §07 "pre-round loadout" — biome-specific dangers row. Replaces the
// abstract description with concrete things that can go wrong / are unique
// to the biome, so the player knows what they're packing for.
const DANGERS = {
  mine: [
    { icon: "ui_warning", label: "Cave-ins",       text: "Rubble blocks tiles until cleared." },
    { icon: "ui_warning", label: "Mysterious Ore", text: "5-turn countdown — chain with ≥2 dirt for a Rune." },
    { icon: "ui_lock",    label: "One-way",        text: "When provisions run out, the expedition ends." },
  ],
  fish: [
    { icon: "ui_water", label: "Tides",       text: "High/low flips every 3 turns; rarer fish only land at low tide." },
    { icon: "ui_lock",  label: "Open water",  text: "When provisions run out, you turn for the harbor." },
  ],
};

const DESCRIPTIONS = {
  mine: "Descend into the depths. Stone, ore, and gems wait below — but you only stay as long as your provisions last.",
  fish: "Cast off from the harbor. Fish come in with the tide; longer trips land the rare catches. Pack enough food for the voyage.",
};

// "This expedition could power…" — given the orders the player currently has
// open, which ones use a resource that lives in this biome's chain pool.
// Cap at 3 so the panel doesn't dominate.
function ordersPoweredBy(state, biomeKey) {
  const biome = BIOMES[biomeKey];
  if (!biome) return [];
  const biomeKeys = new Set();
  for (const r of biome.resources || []) {
    biomeKeys.add(r.key);
    // Walk `.next` so chain-upgrades count too (hay→wheat→…→bread).
    let cur = r;
    const seen = new Set();
    while (cur?.next && !seen.has(cur.key)) {
      seen.add(cur.key);
      biomeKeys.add(cur.next);
      cur = (biome.resources || []).find((x) => x.key === cur.next);
    }
  }
  return (state.orders || [])
    .filter((o) => biomeKeys.has(o.key))
    .slice(0, 3);
}

export function BiomeEntryModal({ biomeKey, state, dispatch, onClose }) {
  const biome = BIOMES[biomeKey];
  const level = state.level ?? 1;
  const unlockLevel = biomeKey === "mine" ? 2 : biomeKey === "fish" ? 3 : 0;
  const locked = level < unlockLevel;
  const zoneId = state.activeZone ?? state.mapCurrent ?? "home";
  const portraitIcon = biomeKey === "mine" ? "biome_mine" : "biome_fish";

  // Vol II §06 Phone Portrait #5 / Polish #9 — three-step wizard so the
  // packed-tall content doesn't bury the depart CTA below the fold. The
  // step bar always shows, sticky Actions row pins the CTA.
  const [step, setStep] = useState(locked ? "dangers" : "pack");

  const available = Object.keys(EXPEDITION_FOOD_TURNS)
    .map((key) => ({ key, have: state.inventory?.[key] ?? 0, per: expeditionTurnsForFood(state, key, zoneId) }))
    .filter((f) => f.have > 0);

  const [supply, setSupply] = useState({});
  const totalTurns = expeditionTurnsFromSupply(state, supply, zoneId);
  const canDepart = !locked && totalTurns >= MIN_EXPEDITION_TURNS;

  const built = state.built?.[zoneId] ?? {};
  const bonuses = [];
  if (built.larder) bonuses.push("Larder +1");
  if (biomeKey === "mine" && built.mining_camp) bonuses.push("Mining Camp +1");
  if (biomeKey === "fish" && (built.pier || built.harbor_dock)) bonuses.push("Pier +1");

  const setCount = (key, n, max) => setSupply((s) => {
    const v = Math.max(0, Math.min(n, max));
    const next = { ...s };
    if (v <= 0) delete next[key]; else next[key] = v;
    return next;
  });
  const packAll = () => setSupply(Object.fromEntries(available.map((f) => [f.key, f.have])));
  const depart = () => { dispatch({ type: "EXPEDITION/DEPART", payload: { biomeKey, supply } }); onClose(); };

  const dangers = DANGERS[biomeKey] || [];
  const orderHits = locked ? [] : ordersPoweredBy(state, biomeKey);

  const tools = state.tools || {};
  const ownedToolKeys = Object.entries(tools)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k]) => k);

  // ── Step renderers ──────────────────────────────────────────────────────
  const renderPack = () => (
    available.length === 0 ? (
      <Banner tone="warning">
        You have no provisions. Bake bread, gather apples, or buy supplies first.
      </Banner>
    ) : (
      <>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">Pack provisions</span>
          <button onClick={packAll} className="text-[11px] font-bold text-[var(--moss-deep)] hover:text-[#3a5a10] underline">
            Pack all
          </button>
        </div>
        <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-0.5" style={{ overscrollBehavior: "contain" }}>
          {available.map((f) => {
            const n = supply[f.key] ?? 0;
            const label = FOOD_LABELS[f.key] || f.key;
            return (
              <ResourceCell
                key={f.key}
                resource={{ key: f.key, label, sub: `${f.per} turns / ration` }}
                density="row"
                trailing={
                  <Stepper
                    value={n}
                    min={0}
                    max={f.have}
                    onChange={(v) => setCount(f.key, v, f.have)}
                    suffix={` / ${f.have}`}
                    ariaLabel={`Pack ${label}`}
                  />
                }
              />
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="bg-white/60 border border-[var(--iron-soft)] rounded-xl px-4 py-2 flex flex-col items-center min-w-[88px]">
            <span className="text-[10px] uppercase font-bold text-[var(--ink-mute)] tracking-tight">Total Turns</span>
            <span className="text-[20px] font-black text-[var(--moss-deep)] tabular-nums">{totalTurns}</span>
          </div>
          {bonuses.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {bonuses.map((b) => (
                <div key={b} className="text-[11px] font-bold text-[var(--moss-deep)] flex items-center gap-1">✨ {b}</div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  );

  const renderDangers = () => (
    <div className="flex flex-col gap-2">
      <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">What waits down there</span>
      <div className="flex flex-col gap-2">
        {dangers.map((d, i) => (
          <div key={i} className="flex items-start gap-2.5 bg-white/40 border border-[var(--iron-soft)] rounded-lg px-3 py-2">
            <div className="flex-shrink-0 mt-0.5">
              <Icon iconKey={d.icon} size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--ember-deep)] leading-tight">{d.label}</div>
              <div className="text-[12px] text-[var(--ink-warm)] leading-snug">{d.text}</div>
            </div>
          </div>
        ))}
      </div>
      {orderHits.length > 0 && (
        <>
          <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)] mt-2">This run could fill</span>
          <div className="flex flex-col gap-1">
            {orderHits.map((o) => {
              const res = ITEMS[o.key];
              const label = res?.label || o.key;
              const have = state.inventory?.[o.key] ?? 0;
              return (
                <div key={o.id} className="flex items-center gap-2 bg-white/40 border border-[var(--iron-soft)] rounded-lg px-3 py-1.5">
                  <Icon iconKey={o.key} size={16} />
                  <span className="text-[12px] font-bold text-[var(--ink-strong)] flex-1 truncate">{label}</span>
                  <span className="text-[11px] font-bold tabular-nums text-[var(--ink-warm)]">{Math.min(have, o.need)}/{o.need}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderSetOut = () => (
    <div className="flex flex-col gap-3">
      <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">You're packing</span>
      <div className="flex items-center gap-3 bg-white/50 border border-[var(--iron-soft)] rounded-xl px-3 py-2.5">
        <div className="flex flex-col items-center min-w-[64px]">
          <div className="text-[10px] uppercase font-bold text-[var(--ink-mute)] tracking-tight">Turns</div>
          <div className="text-[22px] font-black text-[var(--moss-deep)] tabular-nums leading-none">{totalTurns}</div>
        </div>
        <div className="flex-1 flex flex-wrap gap-1.5">
          {Object.entries(supply).filter(([, n]) => n > 0).map(([k, n]) => (
            <Pill key={k} size="sm" leading={<Icon iconKey={k} size={12} />}>
              <span className="tabular-nums">×{n}</span>
            </Pill>
          ))}
          {Object.values(supply).every((n) => !n) && (
            <span className="text-[11px] italic text-[var(--ink-mute)]">Nothing yet — head back to Pack.</span>
          )}
        </div>
      </div>

      <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">Tools you'll bring</span>
      {ownedToolKeys.length === 0 ? (
        <Banner tone="info">No tools owned yet. You can still go without — chains alone cover the basics.</Banner>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ownedToolKeys.map((k) => (
            <Pill key={k} size="sm" leading={hasIcon(k) ? <IconCanvas iconKey={k} size={14} /> : <Icon iconKey={k} size={14} />}>
              <span className="tabular-nums">×{tools[k]}</span>
            </Pill>
          ))}
        </div>
      )}

      {bonuses.length > 0 && (
        <>
          <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">Built bonuses</span>
          <div className="flex flex-wrap gap-1.5">
            {bonuses.map((b) => (
              <Pill key={b} tone="moss" variant="soft" size="sm">✨ {b}</Pill>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const stepLabels = locked ? [] : [
    { key: "pack",     label: "Pack",     valid: true },
    { key: "dangers",  label: "Dangers",  valid: true },
    { key: "set-out",  label: "Set out",  valid: canDepart },
  ];

  return (
    <ParchmentDialog open onClose={onClose} size="md" labelledBy="biome-entry-title">
      <div className="px-6 pt-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid place-items-center flex-shrink-0" style={{ width: 64, height: 64 }}>
            <IconCanvas iconKey={portraitIcon} size={64} />
          </div>
          <div className="min-w-0">
            <h2 id="biome-entry-title" className="font-bold text-[21px] text-[var(--ember-deep)] leading-tight">{biome.name}</h2>
            <p className="text-[var(--ink-warm)] text-[12px] leading-snug">{DESCRIPTIONS[biomeKey]}</p>
          </div>
        </div>

        {!locked && (
          // Step strip — three pills along the top so the wizard shape is
          // obvious without a separate progress bar. Each pill is tappable.
          <div className="flex gap-1 mb-1 -mx-0.5">
            {stepLabels.map((s, i) => {
              const active = step === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(s.key)}
                  className={`flex-1 text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-1.5 border-2 transition-colors ${active ? "bg-[var(--ember)] text-white border-[var(--ember-deep)]" : "bg-white/40 text-[var(--ink-warm)] border-[var(--iron-soft)] hover:bg-white/60"}`}
                  aria-current={active ? "step" : undefined}
                >
                  {i + 1}. {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ParchmentDialog.Body>
        {locked ? (
          <Banner tone="warning">
            <span className="flex items-center gap-1.5"><Icon iconKey="ui_lock" size={14} /> Unlocks at Level {unlockLevel}</span>
          </Banner>
        ) : step === "pack" ? renderPack()
          : step === "dangers" ? renderDangers()
          : renderSetOut()}
      </ParchmentDialog.Body>

      <ParchmentDialog.Actions>
        {locked ? (
          <Button tone="iron" size="md" onClick={onClose}>Close</Button>
        ) : step === "set-out" ? (
          <Button tone="moss" size="lg" block disabled={!canDepart} onClick={depart}>
            {!canDepart
              ? totalTurns > 0
                ? `Need ${MIN_EXPEDITION_TURNS} turns min`
                : "Pack provisions first"
              : "Set departure"}
          </Button>
        ) : (
          <Button
            tone="ember"
            size="lg"
            block
            onClick={() => setStep(step === "pack" ? "dangers" : "set-out")}
          >
            Next →
          </Button>
        )}
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
