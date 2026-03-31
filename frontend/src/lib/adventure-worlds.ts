import type { AdventureWorld, DeficitArea, GameDefinition } from "@/types";
import { DEFICIT_AREA_COLORS, DEFICIT_AREA_MAP_NAMES, isDeficitArea } from "@/types";

/** Dungeon / recap games — not pickable in the adventure builder. */
export const HIDDEN_ADVENTURE_GAME_IDS = new Set([
  "castle_challenge",
  "dungeon_forest",
  "dungeon_beach",
  "dungeon_3stage",
]);

/**
 * Strip invalid / hidden game IDs and reindex worlds (used when loading saved maps).
 */
export function normalizeAdventureWorlds(worlds: AdventureWorld[]): AdventureWorld[] {
  const normalized: AdventureWorld[] = [];
  for (const world of worlds) {
    const uniqueIds = Array.from(new Set((world.game_ids || []).filter(Boolean))).filter(
      (id) => !HIDDEN_ADVENTURE_GAME_IDS.has(id)
    );
    if (uniqueIds.length === 0) continue;
    normalized.push({
      ...world,
      world_number: normalized.length + 1,
      game_ids: uniqueIds,
    });
  }
  return normalized;
}

/**
 * After AI/template suggest: keep only real game IDs for the child's age and deficit area.
 * If the model hallucinated IDs, backfill from the catalog so worlds are usable.
 */
export function sanitizeSuggestedAdventureWorlds(
  worlds: AdventureWorld[],
  studentAge: number,
  catalog: GameDefinition[]
): AdventureWorld[] {
  const validById = new Map(catalog.map((g) => [g.id, g]));
  const out: AdventureWorld[] = [];

  for (const w of worlds) {
    const rawArea = w.deficit_area;
    if (!isDeficitArea(rawArea)) continue;
    const area = rawArea as DeficitArea;

    const inAreaForAge = catalog.filter(
      (g) =>
        g.deficit_area === area &&
        g.age_range_min <= studentAge &&
        g.age_range_max >= studentAge &&
        !HIDDEN_ADVENTURE_GAME_IDS.has(g.id)
    );

    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of w.game_ids || []) {
      const g = validById.get(id);
      if (!g || g.deficit_area !== area) continue;
      if (g.age_range_min > studentAge || g.age_range_max < studentAge) continue;
      if (HIDDEN_ADVENTURE_GAME_IDS.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }

    if (ids.length === 0 && inAreaForAge.length > 0) {
      const take = Math.min(4, inAreaForAge.length);
      for (let i = 0; i < take; i++) ids.push(inAreaForAge[i].id);
    }

    if (ids.length === 0) continue;

    out.push({
      ...w,
      deficit_area: area,
      world_number: out.length + 1,
      world_name: DEFICIT_AREA_MAP_NAMES[area] || w.world_name,
      color: DEFICIT_AREA_COLORS[area] || w.color,
      game_ids: ids,
    });
  }

  return out;
}
