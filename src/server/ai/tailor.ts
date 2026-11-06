import {
  ItemProposal,
  BulletProposal,
  Proposal,
  RawProposal,
  RawProposalSchema,
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

/**
 * Short names the model uses instead of the CV's real ids: items are "i1", "i2", ..., bullets
 * "i1.b1", "i1.b2", ... Long random ids confuse small models (they swap item and bullet ids,
 * or copy the bullet text instead). `refs` maps a name back to the real thing.
 */
export interface CvRefs {
  items: Map<string, string>;
  bullets: Map<string, { itemId: string; bulletId: string; text: string }>;
}

export function buildRefs(vault: Vault): CvRefs {
  const refs: CvRefs = { items: new Map(), bullets: new Map() };
  let itemNumber = 0;
  for (const section of vault.sections) {
    for (const item of section.items) {
      itemNumber += 1;
      refs.items.set(`i${itemNumber}`, item.id);
      item.bullets.forEach((bullet, index) => {
        refs.bullets.set(`i${itemNumber}.b${index + 1}`, {
          itemId: item.id,
          bulletId: bullet.id,
          text: bullet.text,
        });
      });
    }
  }
  return refs;
}

/** What the model is told about the CV: short names, text, tags. Nothing it does not need. */
export function describeCv(
  vault: Vault,
  refs: CvRefs = buildRefs(vault)
): unknown {
  const itemRef = new Map([...refs.items].map(([ref, id]) => [id, ref]));
  const bulletRef = new Map(
    [...refs.bullets].map(([ref, value]) => [value.bulletId, ref])
  );
  return {
    sections: vault.sections.map((section) => ({
      title: section.title,
      type: section.type,
      items: section.items.map((item) => ({
        id: itemRef.get(item.id),
        label: getItemLabel(item),
        fields: item.fields,
        tags: item.tags,
        bullets: item.bullets.map((bullet) => ({
          id: bulletRef.get(bullet.id),
          text: bullet.text,
          tags: bullet.tags,
          ...(bullet.rating === undefined ? {} : { rating: bullet.rating }),
        })),
      })),
    })),
  };
}

const WORDINGS = ["short", "long", "formal"] as const;
const DEFAULT_RELEVANCE = 0.5;

/**
 * Turns the forgiving model output into a strict proposal: short names (or, as a fallback, real
 * ids or the bullet's own text) become real ids, a bullet takes its item from the bullet,
 * and anything missing gets a harmless default. Entries about things that do not exist are
 * kept as they are so that `sanitiseProposal` can drop them and say so.
 */
export function toProposal(refs: CvRefs, raw: RawProposal): Proposal {
  const bulletsByText = new Map(
    [...refs.bullets.values()].map((value) => [
      value.text.trim().toLowerCase(),
      value,
    ])
  );

  // Small models sometimes list a bullet ("i2.b1") among the items: treat it as a bullet entry
  const itemEntries = (raw.items ?? []).filter(
    (e) => !refs.bullets.has(e.itemId)
  );
  const bulletLikeItems: NonNullable<RawProposal["bullets"]> = (raw.items ?? [])
    .filter((e) => refs.bullets.has(e.itemId))
    .map((e) => ({
      bulletId: e.itemId,
      isIncluded: e.isIncluded,
      reason: e.reason,
    }));

  const items: ItemProposal[] = itemEntries.map((entry) => ({
    itemId: refs.items.get(entry.itemId) ?? entry.itemId,
    relevance: entry.relevance ?? DEFAULT_RELEVANCE,
    isIncluded: entry.isIncluded ?? true,
    isHighlighted: entry.isHighlighted ?? false,
    reason: entry.reason ?? "",
  }));

  const bullets: BulletProposal[] = [
    ...(raw.bullets ?? []),
    ...bulletLikeItems,
  ].map((entry) => {
    const found =
      refs.bullets.get(entry.bulletId) ??
      bulletsByText.get(entry.bulletId.trim().toLowerCase());
    // the bullet decides which item it is in; small models often get the item id wrong
    const itemId =
      found?.itemId ?? refs.items.get(entry.itemId ?? "") ?? entry.itemId ?? "";
    const wording = (WORDINGS as readonly string[]).includes(
      entry.rewrite?.wording ?? ""
    )
      ? (entry.rewrite?.wording as (typeof WORDINGS)[number])
      : "short";
    return {
      itemId,
      bulletId: found?.bulletId ?? entry.bulletId,
      isIncluded: entry.isIncluded ?? true,
      ...(entry.rewrite && entry.rewrite.text.trim()
        ? { rewrite: { wording, text: entry.rewrite.text } }
        : {}),
      reason: entry.reason ?? "",
    };
  });

  return {
    items,
    bullets,
    statement: raw.statement ?? "",
    gaps: raw.gaps ?? [],
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

  const refs = buildRefs(vault);
  const raw = await ai.generate({
    promptName: "propose-selection",
    input: JSON.stringify({
      requirements,
      tone: input.tone,
      cv: describeCv(vault, refs),
    }),
    schema: RawProposalSchema,
  });

  const { proposal, warnings } = sanitiseProposal(vault, toProposal(refs, raw));
  return { requirements, proposal, warnings };
}
