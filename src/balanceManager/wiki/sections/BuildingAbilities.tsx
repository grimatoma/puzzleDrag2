/**
 * BuildingAbilities.tsx — Rich ability attachment cards for building/worker articles.
 *
 * Instance params (tool, amount, trigger, …) render here; the Related footer
 * lists bare ability names as simple text links.
 */

import React from "react";
import { RelationRefGrid } from "../ConceptRefCard.jsx";
import { relationsFor } from "../relations.js";
import type { WikiLink } from "../relations.js";

/** Ability relation links for a host entity (buildings, workers). */
export function abilityLinksForHost(
  conceptId: string,
  entityKey: string,
  entity: Record<string, unknown>,
): WikiLink[] {
  const group = relationsFor(conceptId, entityKey, entity).find((g) => g.title === "Abilities");
  return group?.links ?? [];
}

export function hasHostAbilities(
  conceptId: string,
  entityKey: string,
  entity: Record<string, unknown> | null,
): boolean {
  if (entity == null) return false;
  if (conceptId !== "buildings" && conceptId !== "workers") return false;
  return abilityLinksForHost(conceptId, entityKey, entity).length > 0;
}

export interface BuildingAbilitiesProps {
  conceptId: "buildings" | "workers";
  entityKey: string;
  entity: Record<string, unknown>;
}

export function BuildingAbilities({ conceptId, entityKey, entity }: BuildingAbilitiesProps) {
  const links = abilityLinksForHost(conceptId, entityKey, entity);
  if (links.length === 0) return null;

  const heading = conceptId === "workers" ? "Worker abilities" : "Building abilities";

  return (
    <section id="host-abilities">
      <div className="wiki-section-heading mb-2">{heading}</div>
      <RelationRefGrid links={links} />
    </section>
  );
}

export default BuildingAbilities;
