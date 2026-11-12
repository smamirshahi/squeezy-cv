import { personalOf } from "@shared/ai/redact-personal";
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";
import {
  AtsWordingRequest,
  AtsWordingResult,
  MAX_ATS_TERMS,
  MAX_ATS_TEXTS,
  RawAtsWordingSchema,
} from "@custom-types/ats-wording-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { NothingToWorkFromError } from "@server/ai/generate-bullets";
import { getItemLabel } from "@shared/variant/item-label";

/** The free text of each kind of section that may be reworded: never names, dates or links */
const TEXT_FIELD: Record<string, string> = {
  summary: "text",
  experience: "description",
  education: "description",
  projects: "description",
  volunteering: "description",
};

interface Candidate {
  itemId: string;
  field: string;
  label: string;
  text: string;
  context: Record<string, string>;
}

function candidatesOf(vault: Vault): Candidate[] {
  return vault.sections
    .flatMap((section) => section.items.map((item) => ({ section, item })))
    .flatMap(({ section, item }) => {
      const field = TEXT_FIELD[section.type];
      const text = field ? (item.fields[field] ?? "").trim() : "";
      return field && text !== ""
        ? [
            {
              itemId: item.id,
              field,
              label: getItemLabel(item),
              text,
              context: Object.fromEntries(
                Object.entries(item.fields).filter(([key]) => key !== field)
              ),
            },
          ]
        : [];
    })
    .slice(0, MAX_ATS_TEXTS);
}

/**
 * Suggests how to put the advert's words (the terms the ATS score found missing or worded
 * differently) into the CV's own texts, where those texts already say it. The model sees those
 * texts and the terms only (no profile; scrubbed like tailoring). Every suggestion is checked
 * against its original with `checkRewrite` and the flags are recomputed here, so an invented
 * skill shows as a warning. Nothing is applied: the user reviews the suggestions first.
 */
export async function suggestAtsWording(
  ai: AiClient,
  vault: Vault,
  request: AtsWordingRequest,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<AtsWordingResult> {
  const terms = [
    ...new Set(request.terms.map((term) => term.trim()).filter(Boolean)),
  ].slice(0, MAX_ATS_TERMS);
  const known = (request.reworded ?? []).filter((term) =>
    terms.includes(term.trim())
  );
  if (terms.length === 0) {
    throw new NothingToWorkFromError("There are no keywords to work in.");
  }
  const candidates = candidatesOf(vault);
  if (candidates.length === 0) {
    throw new NothingToWorkFromError(
      "There is no saved summary or description to reword. Write one in the vault and save first."
    );
  }
  const raw = await ai.generate({
    promptName: "ats-wording",
    input: JSON.stringify({
      terms,
      texts: candidates.map((entry) => ({
        itemId: entry.itemId,
        field: entry.field,
        text: entry.text,
        item: entry.context,
      })),
    }),
    schema: RawAtsWordingSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
  });
  const seen = new Set<string>();
  const suggestions = raw.suggestions.flatMap((entry) => {
    const source = candidates.find(
      (candidate) =>
        candidate.itemId === entry.itemId && candidate.field === entry.field
    );
    const text = entry.text.trim();
    const key = `${entry.itemId}/${entry.field}`;
    if (!source || text === "" || text === source.text || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [
      {
        itemId: source.itemId,
        field: source.field,
        label: source.label,
        original: source.text,
        text,
        flags: describeFlags(
          checkRewrite(text, [
            source.text,
            ...Object.values(source.context),
            ...known,
          ]).flags
        ),
      },
    ];
  });
  return {
    suggestions,
    unplaced: raw.unplaced.filter((term) => terms.includes(term)),
  };
}
