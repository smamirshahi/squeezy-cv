import {
  HideRequest,
  HideResult,
  RawHideSchema,
} from "@custom-types/hide-types";
import { AiClient } from "@server/ai/ai-types";

/**
 * Asks the model which items to hide so the CV fits, then makes the answer safe: only items
 * that were offered, each once, and only as many as are needed (in the model's order). The model
 * sees short ids ("c1", ...) and labels, never the profile. Nothing is applied here.
 */
export async function pickHide(
  ai: AiClient,
  request: HideRequest
): Promise<HideResult> {
  const refs = new Map(
    request.candidates.map((candidate, index) => [`c${index + 1}`, candidate])
  );
  const raw = await ai.generate({
    promptName: "pick-hide",
    input: JSON.stringify({
      linesOver: request.linesOver,
      job: request.jobTitle
        ? { title: request.jobTitle, mustHave: request.mustHave ?? [] }
        : null,
      candidates: [...refs].map(([id, candidate]) => ({
        id,
        label: candidate.label,
        section: candidate.section,
        lines: candidate.lines,
        relevance: candidate.relevance,
      })),
    }),
    schema: RawHideSchema,
  });

  const warnings: string[] = [];
  const suggestions: HideResult["suggestions"] = [];
  const seen = new Set<string>();
  let gained = 0;
  for (const entry of raw.hide) {
    const candidate = refs.get(entry.id.trim());
    if (!candidate) {
      warnings.push(
        `Ignored a suggestion about an unknown item (${entry.id}).`
      );
      continue;
    }
    if (seen.has(candidate.itemId)) {
      continue;
    }
    if (gained >= request.linesOver) {
      warnings.push(
        "The AI suggested more than is needed; only the first ones are kept."
      );
      break;
    }
    seen.add(candidate.itemId);
    gained += candidate.lines;
    suggestions.push({
      itemId: candidate.itemId,
      reason: entry.reason?.trim() ?? "",
    });
  }
  if (suggestions.length > 0 && gained < request.linesOver) {
    warnings.push(
      `Hiding these still leaves about ${request.linesOver - gained} ${request.linesOver - gained === 1 ? "line" : "lines"} over.`
    );
  }
  return { suggestions, warnings };
}
