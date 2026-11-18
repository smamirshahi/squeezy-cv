import { isLanguageGroup } from "@shared/vault/skill-suggestions";
import { levelLabel } from "@shared/vault/vault-utils";

/** Levels in the "Grouped rows" skills layout: none, only those that differ from the usual one, or all */
export type GroupedLevels = "off" | "exceptions" | "all";

/** The part of a skill the levels need */
interface Rated {
  rating?: number;
}

/** The level most skills of the group have; undefined when there is none or two levels tie */
function usualLevel(bullets: Rated[]): number | undefined {
  const counts = new Map<number, number>();
  for (const bullet of bullets) {
    const level = Math.floor(bullet.rating ?? 0);
    if (level > 0) {
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[1]?.[1] === ranked[0][1]) {
    return undefined;
  }
  return ranked[0][0];
}

/**
 * The level text to show after each skill of a group (undefined = nothing). "Exceptions"
 * marks only the skills that differ from the group's usual level; without a clear usual
 * level nothing is marked, as that would flag skills at random. A languages group shows
 * every level, because there each one is information.
 */
export function groupedLevelLabels(
  bullets: Rated[],
  mode: GroupedLevels,
  category?: string
): (string | undefined)[] {
  const effective = mode !== "off" && isLanguageGroup(category) ? "all" : mode;
  const usual = effective === "exceptions" ? usualLevel(bullets) : undefined;
  return bullets.map((bullet) => {
    const level = Math.floor(bullet.rating ?? 0);
    if (effective === "off" || level === 0) {
      return undefined;
    }
    if (
      effective === "exceptions" &&
      (usual === undefined || level === usual)
    ) {
      return undefined;
    }
    return levelLabel(level, category);
  });
}
