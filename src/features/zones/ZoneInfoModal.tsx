import {
  ZONES,
  displayZoneName,
  settlementBiome,
  settlementHazards,
  zoneBaseTurns,
  zoneFarmBoard,
  zoneHasBoard,
  type Zone,
} from "./data.js";
import {
  SESSION_SEASON_NAMES,
  ZONE_CATEGORY_LABELS,
  boardKindLabels,
  formatDropWeight,
  upgradeTargetLabel,
  zoneInfoCategories,
  type SessionSeasonName,
} from "./zoneInfoFormat.js";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";
import Icon from "../../ui/Icon.jsx";
import type { ReactNode } from "react";
import type { GameState } from "../../types/state.js";

interface ZoneInfoModalProps {
  zoneId: string;
  state: GameState;
  onClose: () => void;
  /** When set, that season column is highlighted (e.g. current in-session season on the board). */
  highlightSeason?: SessionSeasonName | null;
}

function ModifierRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px] leading-snug">
      <span className="text-on-panel-faint font-semibold shrink-0">{label}</span>
      <span className="text-on-panel text-right">{children}</span>
    </div>
  );
}

export default function ZoneInfoModal({ zoneId, state, onClose, highlightSeason }: ZoneInfoModalProps) {
  const zone: Zone | undefined = ZONES[zoneId];
  const name = displayZoneName(state, zoneId);
  const categories = zoneInfoCategories(zone);
  const hazards = settlementHazards(state, zoneId);
  const biome = settlementBiome(state, zoneId);
  const farmBoard = zoneFarmBoard(zone);
  const entryCoins = zone?.entryCost?.coins ?? 0;
  const boards = boardKindLabels(zone);

  const turnLabels: string[] = [];
  if (zoneHasBoard(zone, "farm")) turnLabels.push(`Farm ${zoneBaseTurns(zone, "farm")}`);
  if (zoneHasBoard(zone, "mine")) turnLabels.push(`Mine ${zoneBaseTurns(zone, "mine")}`);
  if (zoneHasBoard(zone, "fish")) turnLabels.push(`Harbor ${zoneBaseTurns(zone, "fish")}`);

  return (
    <ParchmentDialog open onClose={onClose} size="lg" ariaLabel={`${name} — zone details`}>
      <ParchmentDialog.Title>{name}</ParchmentDialog.Title>
      <ParchmentDialog.Body className="!px-5 !py-4 flex flex-col gap-4 max-h-[min(70vh,520px)] overflow-y-auto">
        {!zone ? (
          <p className="text-body text-on-panel-faint">No zone data for this location.</p>
        ) : (
          <>
            <section className="flex flex-col gap-1.5">
              <div className="hl-section-label">Session</div>
              <div className="hl-card !p-2.5 flex flex-col gap-1">
                <ModifierRow label="Boards">{boards.length ? boards.join(" · ") : "—"}</ModifierRow>
                <ModifierRow label="Base turns">{turnLabels.length ? turnLabels.join(" · ") : "—"}</ModifierRow>
                {zoneHasBoard(zone, "farm") && (
                  <ModifierRow label="Farm entry">{entryCoins}◉</ModifierRow>
                )}
                {(zoneHasBoard(zone, "mine") || zoneHasBoard(zone, "fish")) && (
                  <ModifierRow label="Expedition">Pack food · no coin entry</ModifierRow>
                )}
              </div>
            </section>

            {categories.length > 0 && (
              <section className="flex flex-col gap-1.5">
                <div className="hl-section-label">Tile spawn rates by season</div>
                <p className="text-[11px] text-on-panel-faint leading-snug">
                  When the board refills, one category is rolled from this table for the current in-session season.
                </p>
                <div className="overflow-x-auto rounded-lg border border-[#8c7656]/40">
                  <table className="min-w-full text-[11px]">
                    <thead>
                      <tr className="bg-[#dbcfb6]/80">
                        <th className="text-left px-2 py-1.5 font-bold text-on-panel-dim">Category</th>
                        {SESSION_SEASON_NAMES.map((season) => (
                          <th
                            key={season}
                            className={`text-right px-2 py-1.5 font-bold whitespace-nowrap ${
                              highlightSeason === season ? "text-[#2a5010] bg-[#cfe8a8]/60" : "text-on-panel-dim"
                            }`}
                          >
                            {season}
                            {highlightSeason === season ? " · now" : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat} className="border-t border-[#8c7656]/25">
                          <td className="px-2 py-1 text-on-panel font-semibold">
                            {ZONE_CATEGORY_LABELS[cat] ?? cat}
                          </td>
                          {SESSION_SEASON_NAMES.map((season) => {
                            const w = farmBoard?.seasonDrops?.[season]?.[cat];
                            return (
                              <td
                                key={`${cat}-${season}`}
                                className={`px-2 py-1 text-right tabular-nums ${
                                  highlightSeason === season ? "bg-[#cfe8a8]/30 font-semibold" : ""
                                }`}
                              >
                                {formatDropWeight(w)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {Object.keys(farmBoard?.upgradeMap ?? {}).length > 0 && (
              <section className="flex flex-col gap-1.5">
                <div className="hl-section-label">Chain upgrades</div>
                <p className="text-[11px] text-on-panel-faint leading-snug">
                  Long chains on a category spawn the next-tier tile listed here.
                </p>
                <ul className="flex flex-col gap-1">
                  {Object.entries(farmBoard!.upgradeMap).map(([src, tgt]) => (
                    <li
                      key={src}
                      className="flex items-center justify-between gap-2 text-[12px] bg-[#fffaf1] border border-[#8c7656]/35 rounded-lg px-2 py-1"
                    >
                      <span className="font-semibold text-on-panel">{ZONE_CATEGORY_LABELS[src] ?? src}</span>
                      <span className="text-on-panel-faint">→</span>
                      <span className="font-semibold text-on-panel text-right">{upgradeTargetLabel(tgt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(hazards.length > 0 || biome?.bonus) && (
              <section className="flex flex-col gap-1.5">
                <div className="hl-section-label">Modifiers</div>
                {biome && (
                  <div className="text-[12px] text-on-panel leading-snug">
                    <span className="font-bold">{biome.look?.icon ?? ""} {biome.name}</span>
                    {biome.bonus && (
                      <span className="text-on-panel-faint"> — {biome.bonus}</span>
                    )}
                  </div>
                )}
                {hazards.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hazards.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#9a3a2a]/10 text-[#9a3a2a] border border-[#9a3a2a]/30 rounded-lg px-2 py-0.5 capitalize"
                      >
                        <Icon iconKey="dangers_header" size={12} />
                        {h.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ghost" size="md" onClick={onClose}>Close</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
