import {
  ItemProposal,
  BulletProposal,
  Proposal,
  ProposalSchema,
  RequirementsSchema,
  Requirements,
  TailorResult,
} from "@custom-types/tailor-types";
import { Tone } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { getItemLabel } from "@shared/variant/item-label";

/** What the model is told about the CV: ids, text, tags. Nothing it does not need. */
export function describeCv(vault: Vault): unknown {
  return {
    sections: vault.sections.map((section) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      items: section.items.map((item) => ({
        id: item.id,
        label: getItemLabel(item),
        fields: item.fields,
        tags: item.tags,
        bullets: item.bullets.map((bullet) => ({
          id: bullet.id,
          text: bullet.text,
          tags: bullet.tags,
          ...(bullet.rating === undefined ? {} : { rating: bullet.rating }),
        })),
      })),
    })),
  };
}

interface Sanitised {
  proposal: Proposal;
  warnings: string[];
}

/**
 * Makes the model's proposal safe to show: entries about ids that are not in the CV are
 * dropped (and said so), and relevance is kept within 0 to 1.
 */
export function sanitiseProposal(vault: Vault, proposal: Proposal): Sanitised {
  const warnings: string[] = [];
  const itemIds = new Set(
    vault.sections.flatMap((s) => s.items.map((i) => i.id))
  );
  const bulletIds = new Map(
    vault.sections
      .flatMap((s) => s.items)
      .map((item) => [item.id, new Set(item.bullets.map((b) => b.id))])
  );

  const items: ItemProposal[] = [];
  for (const entry of proposal.items) {
    if (!itemIds.has(entry.itemId)) {
      warnings.push(
        `Ignored a suggestion about an unknown item (${entry.itemId}).`
      );
      continue;
    }
    items.push({
      ...entry,
      relevance: Math.min(1, Math.max(0, entry.relevance)),
    });
  }

  const bullets: BulletProposal[] = [];
  for (const entry of proposal.bullets) {
    if (!bulletIds.get(entry.itemId)?.has(entry.bulletId)) {
      warnings.push(
        `Ignored a suggestion about an unknown bullet (${entry.bulletId}).`
      );
      continue;
    }
    bullets.push(entry);
  }

  return { proposal: { ...proposal, items, bullets }, warnings };
}

export interface TailorInput {
  jobAd: string;
  tone: Tone;
}

/**
 * Two calls (plan section 10): first what the job asks for, then, given the CV, which items and
 * bullets to show, what to highlight, how to reword, a draft statement and the gaps.
 */
export async function tailor(
  ai: AiClient,
  vault: Vault,
  input: TailorInput
): Promise<TailorResult> {
  const requirements: Requirements = await ai.generate({
    promptName: "extract-requirements",
    input: input.jobAd,
    schema: RequirementsSchema,
  });

  const raw = await ai.generate({
    promptName: "propose-selection",
    input: JSON.stringify({
      requirements,
      tone: input.tone,
      cv: describeCv(vault),
    }),
    schema: ProposalSchema,
  });

  const { proposal, warnings } = sanitiseProposal(vault, raw);
  return { requirements, proposal, warnings };
}
