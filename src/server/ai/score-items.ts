import {
  RawScoreSchema,
  SCORE_BATCH_SIZE,
  ScoreResult,
} from "@custom-types/score-types";
import { Requirements, RequirementsSchema } from "@custom-types/tailor-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { cleanRequirementList } from "@server/ai/tailor";
import { personalOf } from "@shared/ai/redact-personal";
import { getItemLabel } from "@shared/variant/item-label";

const MAX_SCORE = 100;
const MAX_REASON = 200;

/**
 * Scores every item of the saved CV against the advert: first what the job asks for (the same
 * extraction as tailoring), then one call per section (large sections are split). The model sees
 * short ids ("i1"...), item text and tags, never the profile (scrubbed like tailoring). The answer
 * is made safe: unknown or repeated ids are dropped, scores are rounded and kept within 0-100.
 * Nothing is applied here.
 */
export async function scoreItems(
  ai: AiClient,
  vault: Vault,
  jobAd: string,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<ScoreResult> {
  const personal = personalOf(vault, options.isMaskingOrganisations === true);
  const warnings: string[] = [];
  const onWarning = (message: string): void => {
    warnings.push(message);
  };
  const extracted: Requirements = await ai.generate({
    promptName: "extract-requirements",
    input: jobAd,
    schema: RequirementsSchema,
    personal,
    onWarning,
  });
  const requirements = {
    ...extracted,
    mustHave: cleanRequirementList(extracted.mustHave),
    niceToHave: cleanRequirementList(extracted.niceToHave),
    keywords: cleanRequirementList(extracted.keywords),
  };

  const scores: ScoreResult["scores"] = [];
  const seen = new Set<string>();
  let number = 0;
  for (const section of vault.sections) {
    const entries = section.items.map((item) => {
      number += 1;
      return { ref: `i${number}`, item };
    });
    for (let start = 0; start < entries.length; start += SCORE_BATCH_SIZE) {
      const batch = entries.slice(start, start + SCORE_BATCH_SIZE);
      const byRef = new Map(batch.map((entry) => [entry.ref, entry.item]));
      const raw = await ai.generate({
        promptName: "score-items",
        input: JSON.stringify({
          requirements,
          items: batch.map(({ ref, item }) => ({
            id: ref,
            label: getItemLabel(item),
            section: section.title,
            fields: item.fields,
            tags: item.tags,
            bullets: item.bullets.map((bullet) => bullet.text),
          })),
        }),
        schema: RawScoreSchema,
        personal,
        onWarning,
      });
      for (const entry of raw.scores) {
        const item = byRef.get(entry.id.trim());
        if (!item) {
          warnings.push(`Ignored a score for an unknown item (${entry.id}).`);
          continue;
        }
        if (seen.has(item.id) || !Number.isFinite(entry.relevance)) {
          continue;
        }
        seen.add(item.id);
        scores.push({
          itemId: item.id,
          relevance: Math.min(
            MAX_SCORE,
            Math.max(0, Math.round(entry.relevance))
          ),
          reason: (entry.reason ?? "").trim().slice(0, MAX_REASON),
        });
      }
      const missed = batch.filter(({ item }) => !seen.has(item.id)).length;
      if (missed > 0) {
        warnings.push(
          `${missed} ${missed === 1 ? "item" : "items"} in "${section.title}" got no score.`
        );
      }
    }
  }
  return { scores, warnings };
}
