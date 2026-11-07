import {
  MAX_PLACE_TEXT,
  PlaceRequest,
  PlaceResult,
  RawPlaceSchema,
} from "@custom-types/place-types";
import { AiClient } from "@server/ai/ai-types";
import { PersonalData } from "@shared/ai/redact-personal";

/**
 * Asks the model which section each unsorted item belongs in, then makes the answer safe: only
 * items and sections that were offered, one suggestion per item. The model sees short ids and the
 * item words, never the real ids or the profile. Nothing is moved here.
 */
export async function placeItems(
  ai: AiClient,
  request: PlaceRequest,
  personal?: PersonalData
): Promise<PlaceResult> {
  const items = new Map(
    request.items.map((item, index) => [`i${index + 1}`, item])
  );
  const sections = new Map(
    request.sections.map((section, index) => [`s${index + 1}`, section])
  );
  const raw = await ai.generate({
    promptName: "place-items",
    input: JSON.stringify({
      items: [...items].map(([id, item]) => ({
        id,
        label: item.label,
        text: item.text.slice(0, MAX_PLACE_TEXT),
      })),
      sections: [...sections].map(([id, section]) => ({
        id,
        title: section.title,
        type: section.type,
      })),
    }),
    schema: RawPlaceSchema,
    personal,
  });

  const warnings: string[] = [];
  const suggestions: PlaceResult["suggestions"] = [];
  const seen = new Set<string>();
  for (const entry of raw.placements) {
    const item = items.get(entry.id.trim());
    const section = sections.get(entry.section.trim());
    if (!item || !section) {
      warnings.push(
        item
          ? `Ignored a suggestion about an unknown section (${entry.section}).`
          : `Ignored a suggestion about an unknown item (${entry.id}).`
      );
      continue;
    }
    if (seen.has(item.itemId)) {
      continue;
    }
    seen.add(item.itemId);
    suggestions.push({
      itemId: item.itemId,
      sectionId: section.sectionId,
      reason: entry.reason?.trim() ?? "",
    });
  }
  return { suggestions, warnings };
}
