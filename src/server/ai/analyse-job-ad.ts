import {
  AnalyseResult,
  RawScoreSchema,
  SCORE_BATCH_SIZE,
  ScoreResult,
} from "@custom-types/score-types";
import { RequirementsSchema, Requirements } from "@custom-types/tailor-types";
import { Item, Section, Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { cleanRequirementList } from "@server/ai/tailor";
import { personalOf } from "@shared/ai/redact-personal";
import { getItemLabel } from "@shared/variant/item-label";

const MAX_SCORE = 100;
const MAX_REASON = 200;

interface Options {
  isMaskingOrganisations?: boolean;
}

function clampScore(value: number): number {
  return Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
}

/**
 * Reads the advert once: what the job asks for (title, seniority, must-haves, nice-to-haves,
 * keywords), the same extraction tailoring used. The advert is the only thing sent, never the
 * CV. Nothing is stored here.
 */
export async function analyseJobAd(
  ai: AiClient,
  vault: Vault,
  jobAd: string,
  options: Options = {}
): Promise<AnalyseResult> {
  const warnings: string[] = [];
  const extracted: Requirements = await ai.generate({
    promptName: "extract-requirements",
    input: jobAd,
    schema: RequirementsSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
    onWarning: (message) => warnings.push(message),
  });
  return {
    requirements: {
      ...extracted,
      mustHave: cleanRequirementList(extracted.mustHave),
      niceToHave: cleanRequirementList(extracted.niceToHave),
      keywords: cleanRequirementList(extracted.keywords),
    },
    warnings,
  };
}

/**
 * Scores one section of the saved CV against what the advert asks for: every item (for skills,
 * the category) and every bullet (for skills, each skill) gets 0-100 and a short reason.
 * The model sees short ids ("i1", "i1.b2"), the entry text and the requirements, never the
 * profile (scrubbed like tailoring). Unknown or repeated ids are dropped and scores are
 * rounded and kept within 0-100. Large sections are split. Nothing is applied here.
 */
export async function scoreSection(
  ai: AiClient,
  vault: Vault,
  section: Section,
  requirements: Requirements,
  options: Options = {}
): Promise<ScoreResult> {
  const personal = personalOf(vault, options.isMaskingOrganisations === true);
  const warnings: string[] = [];
  const onWarning = (message: string): void => {
    warnings.push(message);
  };
  const scores: ScoreResult["scores"] = [];
  const seen = new Set<string>();
  const entries = section.items.map((item, index) => ({
    ref: `i${index + 1}`,
    item,
  }));

  for (let start = 0; start < entries.length; start += SCORE_BATCH_SIZE) {
    const batch = entries.slice(start, start + SCORE_BATCH_SIZE);
    const byRef = new Map<string, Item>(
      batch.map((entry) => [entry.ref, entry.item])
    );
    const raw = await ai.generate({
      promptName: "score-section",
      input: JSON.stringify({
        requirements,
        items: batch.map(({ ref, item }) => ({
          id: ref,
          label: getItemLabel(item),
          section: section.title,
          fields: item.fields,
          bullets: item.bullets.map((bullet, index) => ({
            id: `${ref}.b${index + 1}`,
            text: bullet.text,
          })),
        })),
      }),
      schema: RawScoreSchema,
      personal,
      onWarning,
    });
    for (const entry of raw.scores) {
      const item = byRef.get(entry.id.trim());
      if (!item) {
        warnings.push(`Ignored a score for an unknown entry (${entry.id}).`);
        continue;
      }
      if (seen.has(item.id) || !Number.isFinite(entry.relevance)) {
        continue;
      }
      seen.add(item.id);
      const ref = entry.id.trim();
      const bulletScores: ScoreResult["scores"][number]["bullets"] = [];
      const seenBullets = new Set<string>();
      for (const bulletEntry of entry.bullets ?? []) {
        const match = /^.*\.b(\d+)$/.exec(bulletEntry.id.trim());
        const bullet = match ? item.bullets[Number(match[1]) - 1] : undefined;
        if (
          !bullet ||
          !bulletEntry.id.trim().startsWith(`${ref}.`) ||
          seenBullets.has(bullet.id) ||
          !Number.isFinite(bulletEntry.relevance)
        ) {
          continue;
        }
        seenBullets.add(bullet.id);
        bulletScores.push({
          bulletId: bullet.id,
          relevance: clampScore(bulletEntry.relevance),
          reason: (bulletEntry.reason ?? "").trim().slice(0, MAX_REASON),
        });
      }
      scores.push({
        itemId: item.id,
        relevance: clampScore(entry.relevance),
        reason: (entry.reason ?? "").trim().slice(0, MAX_REASON),
        bullets: bulletScores,
      });
    }
    const missed = batch.filter(({ item }) => !seen.has(item.id)).length;
    if (missed > 0) {
      warnings.push(
        `${missed} ${missed === 1 ? "entry" : "entries"} in "${section.title}" got no score.`
      );
    }
  }
  return { scores, warnings };
}
