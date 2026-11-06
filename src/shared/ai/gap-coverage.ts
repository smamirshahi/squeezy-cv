/** Words that say nothing about a skill, so they do not count when matching a gap to the CV */
const FILLER_WORDS = new Set([
  "experience",
  "experienced",
  "knowledge",
  "skills",
  "skill",
  "strong",
  "good",
  "proven",
  "years",
  "year",
  "with",
  "and",
  "the",
  "of",
  "in",
  "to",
  "using",
  "use",
  "working",
  "work",
  "ability",
  "understanding",
  "familiarity",
  "proficiency",
  "demonstrable",
  "solid",
  "hands-on",
]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when every meaningful word of the gap already appears in the CV text, i.e. the gap is
 * not a gap (the model said Redux Toolkit was missing but the CV has it).
 */
export function isGapCoveredByCv(gap: string, cvText: string): boolean {
  const terms = gap
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !FILLER_WORDS.has(t));
  if (terms.length === 0) {
    return false;
  }
  const haystack = cvText.toLowerCase();
  return terms.every((term) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`).test(haystack)
  );
}
