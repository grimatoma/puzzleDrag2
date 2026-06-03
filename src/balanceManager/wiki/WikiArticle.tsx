/**
 * WikiArticle.tsx — Unified Wikipedia-style article template for the Dev Panel Wiki.
 *
 * Composes the modules built in earlier tasks into a full article layout:
 *   - Title row: back button, breadcrumb, entity name, key code, status chip
 *   - Two-column layout: main content column + right-rail Infobox
 *   - Left column: TableOfContents, lede paragraph, authored HTML body,
 *     Properties field table, forward Relations, What links here (backlinks)
 *
 * READ-ONLY — no editable controls.
 *
 * Navigation via wikiNavTarget so Phase 5 can swap routing in one place.
 *
 * TODO (Phase 5): Add a "Browse all <concept>" section once per-concept
 * category routing lands. Relations + backlinks already provide cross-links
 * in the interim.
 */

import React from "react";
import { Card, SmallButton, COLORS } from "../shared.jsx";
import { describeSchema } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";
import { getEntity } from "./conceptEntities.js";
import { CONCEPTS } from "./concepts.js";
import { useBalanceNav } from "../balanceNav.jsx";
import { RelationalFooter } from "../relational.jsx";
import { WikiRelationLinks } from "./WikiRelationLinks.jsx";
import { relationsFor } from "./relations.js";
import { backlinksFor } from "./backlinks.js";
import { ledeFor } from "./lede.js";
import { bodyFor } from "./htmlContent.js";
import HtmlBody from "./HtmlBody.jsx";
import { Infobox } from "./Infobox.jsx";
import { TableOfContents } from "./TableOfContents.jsx";
import type { TocItem } from "./TableOfContents.jsx";
import PageKindBadge from "./PageKindBadge.jsx";
import { pageKindFor } from "./pageKind.js";
import { statusForEntity } from "./status.js";
import { StatusBadge } from "./StatusBadge.jsx";
import { ReferenceSection } from "./ReferenceSection.jsx";
import { useWikiView } from "./wikiView.js";
import { FieldsTable, AdditionalFieldsSection, LiveConfigFallback } from "./FieldsTable.jsx";
import { AmountChips, RecipeIO } from "./EntityVisual.jsx";
import { WhereUsed, hasWhereUsed } from "./sections/WhereUsed.jsx";
import { BossDifficulty, hasBossDifficulty } from "./sections/BossDifficulty.jsx";
import { NpcGifts, hasNpcGifts } from "./sections/NpcGifts.jsx";
import { TileUnlock, hasTileUnlock } from "./sections/TileUnlock.jsx";
import { ZoneDetail, hasZoneDetail } from "./sections/ZoneDetail.jsx";
import { BoardKindDetail, hasBoardKindDetail } from "./sections/BoardKindDetail.jsx";
import { AbilitySpec, hasAbilitySpec } from "./sections/AbilitySpec.jsx";
import { ToolPowerSpec, hasToolPowerSpec } from "./sections/ToolPowerSpec.jsx";
import { KeeperEncounter, hasKeeperEncounter } from "./sections/KeeperEncounter.jsx";
import { BoonCard, hasBoonCard } from "./sections/BoonCard.jsx";
import { DailyRewardsTrack, hasDailyReward } from "./sections/DailyRewardsTrack.jsx";
import { AchievementCard, hasAchievementCard } from "./sections/AchievementCard.jsx";
import MemberTiles, { hasMemberTiles } from "./sections/MemberTiles.jsx";
import { BuildingRecipes, hasBuildingRecipes } from "./sections/BuildingRecipes.jsx";
import { BuildingAbilities, hasHostAbilities } from "./sections/BuildingAbilities.jsx";
import { RecipeRelations, hasRecipeRelationFlow } from "./sections/RecipeRelations.jsx";
import { entityAccent } from "./conceptAccent.js";

// ─── At-a-glance visual ────────────────────────────────────────────────────────

/**
 * Render a lead-in visual summary for concepts whose key attributes are
 * icon+count costs or a recipe flow. Returns null when the concept has no
 * at-a-glance visual (so the caller can skip the whole section + heading).
 *
 * Zones render their cartography map icon in the Infobox (via EntityVisual),
 * so here we only surface the entry cost — not the icon.
 */
function renderAtAGlance(
  conceptId: string,
  entity: Record<string, unknown> | null,
): { heading: string; node: React.ReactNode } | null {
  if (entity == null) return null;

  if (conceptId === "recipes") {
    return {
      heading: "Recipe",
      node: <RecipeIO recipe={entity as { item: string; station?: string; inputs?: Record<string, number> }} />,
    };
  }

  if (conceptId === "buildings") {
    const cost = entity.cost as Record<string, number> | undefined;
    const node = <AmountChips amounts={cost} />;
    if (node == null || cost == null || Object.keys(cost).length === 0) return null;
    return { heading: "Cost to build", node };
  }

  if (conceptId === "zones") {
    const entryCost = entity.entryCost as Record<string, number> | undefined;
    if (entryCost == null || Object.keys(entryCost).length === 0) return null;
    return { heading: "Entry cost", node: <AmountChips amounts={entryCost} /> };
  }

  if (conceptId === "workers") {
    const hireCost = entity.hireCost as
      | { coins?: number; resources?: Record<string, number> }
      | undefined;
    if (hireCost == null) return null;
    const amounts: Record<string, number> = { ...(hireCost.resources ?? {}) };
    if (typeof hireCost.coins === "number" && hireCost.coins > 0) {
      amounts.coins = hireCost.coins;
    }
    if (Object.keys(amounts).length === 0) return null;
    return { heading: "Hire cost", node: <AmountChips amounts={amounts} /> };
  }

  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WikiArticleProps {
  conceptId: string;
  entityKey: string;
  onBack: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WikiArticle({ conceptId, entityKey, onBack }: WikiArticleProps) {
  const { navigate } = useBalanceNav();
  const { view } = useWikiView();

  // Entity + schema
  const entity = getEntity(conceptId, entityKey);
  const conceptLabel = CONCEPTS.find((c) => c.id === conceptId)?.label ?? conceptId;
  const cs = schemaForConcept(conceptId);

  // Build schema doc — catching in case of unexpected schema shape
  let schemaDoc: ReturnType<typeof describeSchema> | null = null;
  if (cs != null) {
    try {
      schemaDoc = describeSchema(cs.schema);
    } catch {
      schemaDoc = null;
    }
  }

  // Status badge
  const status = statusForEntity(conceptId, entityKey);

  // Title for the entity
  const title = entity
    ? (String((entity as Record<string, unknown>).label ?? (entity as Record<string, unknown>).name ?? (entity as Record<string, unknown>).id ?? entityKey))
    : entityKey;

  // Authored HTML body (optional)
  const body = bodyFor(conceptId, entityKey);

  // Relations (forward) — no useMemo: this project runs the React Compiler
  // (eslint-plugin-react-compiler / react-hooks/preserve-manual-memoization),
  // which flags manual useMemo calls it cannot verify as safe. The compiler
  // handles memoization automatically; adding useMemo here produces a lint error.
  const rels = relationsFor(conceptId, entityKey, entity);

  // Backlinks (what links here) — same reason as above.
  const back = backlinksFor(conceptId, entityKey);

  // Schema field names for AdditionalFieldsSection
  const schemaFieldNames = new Set(schemaDoc?.fields.map((f) => f.field) ?? []);

  // At-a-glance visual summary (recipes/buildings/zones/workers) — null otherwise
  const atAGlance = renderAtAGlance(conceptId, entity);

  // Cross-reference sections.
  // - WhereUsed (item articles): "where is this item id referenced".
  const isItemConcept = conceptId === "resources" || conceptId === "tiles" || conceptId === "tools";
  const showWhereUsed = isItemConcept && hasWhereUsed(entityKey);

  // Concept-specific enrichment sections.
  // - BossDifficulty (boss articles): derived difficulty assessment.
  // - NpcGifts (npc articles): loves/likes gift preferences.
  // - TileUnlock (tile articles): how the tile is discovered + its tier.
  const showBossDifficulty =
    conceptId === "bosses" && hasBossDifficulty(entity as Parameters<typeof hasBossDifficulty>[0]);
  const showNpcGifts = conceptId === "npcs" && hasNpcGifts(entityKey);
  const showTileUnlock = conceptId === "tiles" && hasTileUnlock(entityKey);
  const showZoneDetail =
    conceptId === "zones" && hasZoneDetail(entity as Parameters<typeof hasZoneDetail>[0]);
  const showBoardKindDetail =
    conceptId === "boardKinds" &&
    hasBoardKindDetail(entity as Parameters<typeof hasBoardKindDetail>[0]);
  const showAbilitySpec = conceptId === "abilities" && hasAbilitySpec(entity);
  const showToolPowerSpec = conceptId === "toolPowers" && hasToolPowerSpec(entity);
  // Reward / cost enrichment for the post-keeper progression concepts.
  const showKeeperEncounter =
    conceptId === "keepers" &&
    hasKeeperEncounter(entity as Parameters<typeof hasKeeperEncounter>[0]);
  const showBoonCard =
    conceptId === "boons" && hasBoonCard(entity as Parameters<typeof hasBoonCard>[0]);
  const showDailyReward =
    conceptId === "dailyRewards" &&
    hasDailyReward(entity as Parameters<typeof hasDailyReward>[0]);
  const showAchievementCard =
    conceptId === "achievements" &&
    hasAchievementCard(entity as Parameters<typeof hasAchievementCard>[0]);
  const showMemberTiles =
    (conceptId === "categories" || conceptId === "tileDiscoveryMethods") &&
    hasMemberTiles(conceptId, entityKey);
  const showBuildingRecipes = conceptId === "buildings" && hasBuildingRecipes(entityKey);
  const showHostAbilities =
    (conceptId === "buildings" || conceptId === "workers") &&
    hasHostAbilities(conceptId, entityKey, entity);
  const showRecipeRelations = conceptId === "recipes" && hasRecipeRelationFlow(entity);

  const relationGroups = rels.filter((g) => {
    if (showBuildingRecipes && g.title === "Recipes crafted here") return false;
    if (showHostAbilities && g.title === "Abilities") return false;
    return true;
  });

  // Build TOC items — only sections that actually render
  const tocItems: TocItem[] = [
    { id: "overview", label: "Overview" },
    ...(showMemberTiles ? [{ id: "member-tiles", label: "Tiles" }] : []),
    ...(showBossDifficulty ? [{ id: "boss-difficulty", label: "Difficulty" }] : []),
    ...(atAGlance != null ? [{ id: "at-a-glance", label: "At a glance" }] : []),
    ...(showAbilitySpec ? [{ id: "ability-spec", label: "Specification" }] : []),
    ...(showToolPowerSpec ? [{ id: "tool-power-spec", label: "Specification" }] : []),
    ...(showKeeperEncounter ? [{ id: "keeper-encounter", label: "Keeper encounter" }] : []),
    ...(showBoonCard ? [{ id: "boon", label: "Boon" }] : []),
    ...(showDailyReward ? [{ id: "daily-reward", label: "Reward" }] : []),
    ...(showAchievementCard ? [{ id: "achievement", label: "Achievement" }] : []),
    ...(showTileUnlock ? [{ id: "tile-unlock", label: "How to unlock" }] : []),
    ...(showZoneDetail ? [{ id: "zone-detail", label: "Drop rates & upgrades" }] : []),
    ...(showBoardKindDetail ? [{ id: "board-kind-detail", label: "Tiles, dangers & seasons" }] : []),
    ...(showNpcGifts ? [{ id: "npc-gifts", label: "Gift preferences" }] : []),
    ...(showBuildingRecipes ? [{ id: "building-recipes", label: "Recipes crafted here" }] : []),
    ...(showHostAbilities ? [{ id: "host-abilities", label: conceptId === "workers" ? "Worker abilities" : "Building abilities" }] : []),
    ...(showRecipeRelations ? [{ id: "recipe-relations", label: "Crafting flow" }] : []),
    ...(showWhereUsed ? [{ id: "used-in", label: "Used in" }] : []),
    ...(body != null ? [{ id: "about", label: "About" }] : []),
    { id: "properties", label: "Properties" },
    ...(relationGroups.length > 0 ? [{ id: "relations", label: "Related" }] : []),
    ...(back.length > 0 ? [{ id: "backlinks", label: "What links here" }] : []),
  ];

  return (
    <Card style={{ "--wiki-accent": entityAccent(conceptId, entityKey) } as React.CSSProperties}>
      {/* Header row */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <SmallButton onClick={onBack}>← Back</SmallButton>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Breadcrumb — links up to the concept landing page */}
          <button
            type="button"
            title={`Go to ${conceptLabel}`}
            onClick={() => navigate({ tab: conceptId })}
            className="wiki-breadcrumb hover:opacity-80"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            {conceptLabel}
          </button>
          <span style={{ color: COLORS.inkSubtle }}>›</span>
          {/* Entity title — display serif, big */}
          <span className="wiki-title wiki-title--article">
            {title}
          </span>
          {/* Entity key — mono (developer view only) */}
          {view === "developer" && (
            <code
              className="wiki-mono text-[11px] px-1.5 py-0.5 rounded"
              style={{
                background: COLORS.parchmentDeep,
                color: COLORS.inkSubtle,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {entityKey}
            </code>
          )}
          {/* Page-kind badge — only shown for grouping concepts (CATEGORY);
              INSTANCE is self-evident and adds visual noise */}
          {pageKindFor(conceptId) === "category" && (
            <PageKindBadge kind="category" />
          )}

          {/* Status badge — shown in both developer and player views */}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Two-column layout: main content + right-rail Infobox */}
      <div className="flex gap-4 items-start min-w-0">
        {/* LEFT: main content column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 wiki-reveal-stagger">
          {/* Table of contents */}
          <TableOfContents items={tocItems} />

          {/* Lede paragraph */}
          <p
            id="overview"
            className="text-[13px] leading-relaxed"
            style={{ color: COLORS.ink, margin: 0 }}
          >
            {ledeFor(conceptId, entityKey, entity)}
          </p>

          {/* Member tiles (category / discovery-method pages) */}
          {showMemberTiles && <MemberTiles conceptId={conceptId} entityKey={entityKey} />}

          {/* Boss difficulty assessment (boss articles) — near the top */}
          {showBossDifficulty && entity != null && (
            <BossDifficulty boss={entity as React.ComponentProps<typeof BossDifficulty>["boss"]} />
          )}

          {/* At-a-glance visual summary (recipes/buildings/zones/workers) */}
          {atAGlance != null && (
            <section id="at-a-glance">
              <div className="wiki-section-heading mb-2">{atAGlance.heading}</div>
              {atAGlance.node}
            </section>
          )}

          {/* Ability specification (ability articles) */}
          {showAbilitySpec && <AbilitySpec ability={entity} />}

          {/* Tool power specification (tool-power articles) */}
          {showToolPowerSpec && <ToolPowerSpec power={entity} />}

          {/* Keeper founding-bargain encounter (keeper articles) */}
          {showKeeperEncounter && entity != null && (
            <KeeperEncounter keeper={entity as React.ComponentProps<typeof KeeperEncounter>["keeper"]} />
          )}

          {/* Boon cost + effect (boon articles) */}
          {showBoonCard && entity != null && (
            <BoonCard boon={entity as React.ComponentProps<typeof BoonCard>["boon"]} />
          )}

          {/* Daily login reward (daily-reward articles) */}
          {showDailyReward && entity != null && (
            <DailyRewardsTrack day={entity as React.ComponentProps<typeof DailyRewardsTrack>["day"]} />
          )}

          {/* Achievement requirement + reward (achievement articles) */}
          {showAchievementCard && entity != null && (
            <AchievementCard
              achievement={entity as React.ComponentProps<typeof AchievementCard>["achievement"]}
            />
          )}

          {/* Tile unlock requirement (tile articles) */}
          {showTileUnlock && <TileUnlock tileId={entityKey} />}

          {/* Zone drop rates & chain upgrades (zone articles) */}
          {showZoneDetail && entity != null && (
            <ZoneDetail zone={entity as React.ComponentProps<typeof ZoneDetail>["zone"]} />
          )}

          {/* Board-kind detail: tile roster, dangers, seasons & zones */}
          {showBoardKindDetail && entity != null && (
            <BoardKindDetail
              boardKindKey={entityKey}
              boardKind={entity as React.ComponentProps<typeof BoardKindDetail>["boardKind"]}
            />
          )}

          {/* NPC gift preferences (npc articles) */}
          {showNpcGifts && <NpcGifts npcId={entityKey} npc={entity} />}

          {showBuildingRecipes && <BuildingRecipes buildingId={entityKey} />}

          {showHostAbilities && entity != null && (
            <BuildingAbilities conceptId={conceptId as "buildings" | "workers"} entityKey={entityKey} entity={entity} />
          )}

          {showRecipeRelations && entity != null && <RecipeRelations recipe={entity} />}

          {/* Cross-references: where this item is used */}
          {showWhereUsed && <WhereUsed itemId={entityKey} />}

          {/* Authored HTML body (optional) */}
          {body != null && (
            <section id="about">
              <HtmlBody source={body} />
            </section>
          )}

          {/* Properties section — always rendered */}
          <section id="properties">
            <div
              className="wiki-section-heading mb-2"
            >
              Properties
            </div>

            {/* Raw schema table — hidden in player view via ReferenceSection */}
            <ReferenceSection heading="Schema reference (developer)">
              {schemaDoc != null && (
                <>
                  <FieldsTable fields={schemaDoc.fields} entity={entity} />
                  {entity != null && (
                    <AdditionalFieldsSection
                      entity={entity}
                      schemaFieldNames={schemaFieldNames}
                    />
                  )}
                </>
              )}

              {schemaDoc == null && entity != null && (
                <LiveConfigFallback entity={entity} />
              )}

              {schemaDoc == null && entity == null && (
                <div
                  className="text-[12px] italic py-4 text-center"
                  style={{ color: COLORS.inkSubtle }}
                >
                  No data for this entry.
                </div>
              )}
            </ReferenceSection>
          </section>

          {/* Forward relations */}
          {relationGroups.length > 0 && (
            <section id="relations">
              <RelationalFooter standalone title="Related" hint="Derived · click to open">
                {relationGroups.map((group) => (
                  <div key={group.title} className="mb-2 last:mb-0">
                    <div
                      className="text-[9px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {group.title}
                    </div>
                    <WikiRelationLinks links={group.links} />
                  </div>
                ))}
              </RelationalFooter>
            </section>
          )}

          {/* Backlinks — what links here */}
          {back.length > 0 && (
            <section id="backlinks">
              <RelationalFooter standalone title="What links here" hint="Referenced by">
                {back.map((group) => (
                  <div key={group.title} className="mb-3 last:mb-0">
                    <div
                      className="text-[9px] font-bold uppercase tracking-wide mb-2"
                      style={{ color: COLORS.inkSubtle }}
                    >
                      {group.title}
                    </div>
                    <WikiRelationLinks links={group.links} />
                  </div>
                ))}
              </RelationalFooter>
            </section>
          )}
        </div>

        {/* RIGHT: Infobox rail */}
        <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />
      </div>
    </Card>
  );
}
