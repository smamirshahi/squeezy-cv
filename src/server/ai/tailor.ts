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
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";
import { getItemLabel } from "@shared/variant/item-label";

/** How much of a bullet is quoted in a warning */
const QUOTE_LENGTH = 40;

/** All the text of the CV that a statement may draw on */
function allText(vault: Vault): string[] {
  return vault.sections.flatMap((section) =>
    section.items.flatMap((item) => [
      ...Object.values(item.fields),
      ...item.tags,
      ...item.bullets.map((b) => b.text),
    ])
  );
}

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
  const itemById = new Map(
    vault.sections.flatMap((s) => s.items).map((item) => [item.id, item])
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
    // The model's own flags are never trusted: they are always recomputed here
    const rest = { ...entry };
    delete rest.flags;
    if (!rest.rewrite) {
      bullets.push({ ...rest, flags: [] });
      continue;
    }
    const item = itemById.get(entry.itemId);
    const original = item?.bullets.find((b) => b.id === entry.bulletId);
    const sources = [
      original?.text ?? "",
      ...Object.values(item?.fields ?? {}),
      ...(item?.bullets.map((b) => b.text) ?? []),
      ...(item?.tags ?? []),
    ];
    const check = checkRewrite(rest.rewrite.text, sources);
    const flags = describeFlags(check.flags);
    if (flags.length > 0) {
      warnings.push(
        `A rewording of "${original?.text.slice(0, QUOTE_LENGTH) ?? ""}" needs your check: ${flags.join("; ")}.`
      );
    }
    bullets.push({ ...rest, flags });
  }

  const statementCheck = checkRewrite(proposal.statement, allText(vault));
  const statementFlags = describeFlags(statementCheck.flags);
  if (statementFlags.length > 0) {
    warnings.push(
      `The draft statement needs your check: ${statementFlags.join("; ")}.`
    );
  }

  return {
    proposal: { ...proposal, items, bullets, statementFlags },
    warnings,
  };
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
