import { Proposal } from "@custom-types/tailor-types";
import { Requirements } from "@custom-types/requirements-types";
import {
  TailorRecord,
  Tone,
  Variant,
  VariantLayout,
} from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";
import {
  duplicateTemplate,
  resolveVariant,
  splitVariant,
  today,
} from "@shared/variant/template-job";
import { canAutoAccept } from "@shared/ai/guardrails";

/** What the user has decided about the proposal. Nothing is applied that was not accepted. */
export interface Decisions {
  /** Apply the suggestion for this item (shown or hidden, highlight, position) */
  items: Record<string, { isAccepted: boolean }>;

  /** By bullet id: apply showing/hiding, and separately the rewording */
  bullets: Record<string, { isAccepted: boolean; isRewriteAccepted: boolean }>;

  /** Apply the suggested order of the sections (only meaningful when the proposal has one) */
  isSectionOrderAccepted?: boolean;
}

/** An alternative wording to add to a bullet in the vault. The original text is never changed. */
export interface AltUpdate {
  sectionId: string;
  itemId: string;
  bulletId: string;
  wording: "short" | "long" | "formal";
  text: string;
}

export interface AppliedProposal {
  variant: Variant;
  altUpdates: AltUpdate[];
}

/**
 * Starting point for the review: everything is accepted, except a rewording that the
 * guardrails flagged, which has to be accepted by hand.
 */
export function defaultDecisions(proposal: Proposal): Decisions {
  return {
    items: Object.fromEntries(
      proposal.items.map((item) => [item.itemId, { isAccepted: true }])
    ),
    bullets: Object.fromEntries(
      proposal.bullets.map((bullet) => [
        bullet.bulletId,
        {
          isAccepted: true,
          isRewriteAccepted: canAutoAccept(bullet.flags),
        },
      ])
    ),
    ...(proposal.sectionOrder ? { isSectionOrderAccepted: true } : {}),
  };
}

/**
 * Puts the section ids of each column in the relative order of `order`. Header parts and
 * sections not in `order` keep their places. Pure.
 */
export function reorderLayoutSections(
  layout: VariantLayout,
  order: string[]
): VariantLayout {
  const rank = new Map(order.map((id, index) => [id, index]));
  function sortColumn(ids: string[]): string[] {
    const slots = ids
      .map((id, index) => (rank.has(id) ? index : -1))
      .filter((index) => index >= 0);
    const sorted = slots
      .map((index) => ids[index])
      .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    const result = [...ids];
    slots.forEach((slot, position) => {
      result[slot] = sorted[position];
    });
    return result;
  }
  return {
    fullWidth: sortColumn(layout.fullWidth),
    left: sortColumn(layout.left),
    right: sortColumn(layout.right),
  };
}

export interface SectionMove {
  sectionId: string;
  title: string;

  /** 1-based positions among the sections */
  from: number;
  to: number;
}

/** Which sections the suggested order moves, and from where to where */
export function describeSectionMoves(
  vault: Vault,
  order: string[] | undefined
): SectionMove[] {
  if (!order) {
    return [];
  }
  return vault.sections.flatMap((section, index) => {
    const to = order.indexOf(section.id);
    return to >= 0 && to !== index
      ? [
          {
            sectionId: section.id,
            title: section.title,
            from: index + 1,
            to: to + 1,
          },
        ]
      : [];
  });
}

export interface ItemChange {
  /** Shown in the variant now, and as the proposal wants it */
  wasVisible: boolean;
  isVisible: boolean;
  wasHighlighted: boolean;
  isHighlighted: boolean;
  hasChange: boolean;
}

/** How the proposal differs from `variant` for one item */
export function describeItemChange(
  variant: Variant,
  proposal: Proposal["items"][number]
): ItemChange {
  const current = variant.selection[proposal.itemId];
  const wasVisible = current?.isVisible !== false;
  const wasHighlighted = current?.emphasis === "high";
  return {
    wasVisible,
    isVisible: proposal.isIncluded,
    wasHighlighted,
    isHighlighted: proposal.isHighlighted,
    hasChange:
      wasVisible !== proposal.isIncluded ||
      wasHighlighted !== proposal.isHighlighted,
  };
}

/**
 * The new variant that the accepted part of the proposal makes, built on a copy of `base`
 * (same layout, style, tone and page limit), plus the alternative wordings to add to the vault.
 * `base` and the vault are not changed. Items are ordered most relevant first within their section.
 */
export function applyProposal(
  vault: Vault,
  base: Variant,
  proposal: Proposal,
  decisions: Decisions,
  newVariant: { id: string; name: string }
): AppliedProposal {
  const variant: Variant = {
    ...structuredClone(base),
    id: newVariant.id,
    name: newVariant.name,
  };
  delete variant.tuning;
  if (proposal.sectionOrder && decisions.isSectionOrderAccepted) {
    variant.layout = reorderLayoutSections(
      variant.layout,
      proposal.sectionOrder
    );
  }
  const altUpdates: AltUpdate[] = [];

  for (const section of vault.sections) {
    const proposed = proposal.items
      .filter(
        (entry) =>
          decisions.items[entry.itemId]?.isAccepted &&
          section.items.some((i) => i.id === entry.itemId)
      )
      // most relevant first; equal relevance keeps the CV's own order
      .map((entry, index) => ({ entry, index }))
      .sort(
        (a, b) => b.entry.relevance - a.entry.relevance || a.index - b.index
      );

    proposed.forEach(({ entry }, position) => {
      const current = variant.selection[entry.itemId];
      variant.selection[entry.itemId] = {
        ...current,
        isVisible: entry.isIncluded,
        emphasis: entry.isHighlighted ? "high" : "normal",
        relevance: entry.relevance,
        order: position,
      };
    });

    for (const bulletEntry of proposal.bullets) {
      const item = section.items.find((i) => i.id === bulletEntry.itemId);
      const decision = decisions.bullets[bulletEntry.bulletId];
      if (!item || !decision?.isAccepted) {
        continue;
      }
      const selection = variant.selection[item.id] ?? { isVisible: true };
      const bullets = { ...selection.bullets };
      const choice = {
        ...bullets[bulletEntry.bulletId],
        isVisible: bulletEntry.isIncluded,
      };
      if (bulletEntry.rewrite && decision.isRewriteAccepted) {
        choice.wording = bulletEntry.rewrite.wording;
        altUpdates.push({
          sectionId: section.id,
          itemId: item.id,
          bulletId: bulletEntry.bulletId,
          wording: bulletEntry.rewrite.wording,
          text: bulletEntry.rewrite.text,
        });
      }
      bullets[bulletEntry.bulletId] = choice;
      variant.selection[item.id] = { ...selection, bullets };
    }
  }

  return { variant, altUpdates };
}

export interface TailoredJobInput {
  /** Id and name of the new job */
  id: string;
  name: string;

  /** Id for the template copy, used only when one is needed */
  copyTemplateId: string;
  tailor: TailorRecord;

  /** The page limit chosen in the Tailor page; applied (via a template copy) only if it differs */
  pageLimit?: number;

  /** The tone chosen in the Tailor page; written to the job */
  tone?: Tone;
  company?: string;
  role?: string;

  /** "YYYY-MM-DD", default today */
  createdAt?: string;
}

export interface TailoredJob {
  /** The new job. It uses `template` when given, else the source template. */
  job: Job;

  /** A copy of the source template ("<name> (tailored)"), only when the accepted section order or the page limit differ from it */
  template?: Template;
  altUpdates: AltUpdate[];
}

/**
 * Makes the new job for the accepted part of the proposal: selection, relevance, tone and the
 * tailor record belong to the job. The layout (section order) and the page limit belong to the
 * template, so they only change on a NEW copy of `template` that the job then uses; the source
 * template, the base job and the vault are never changed.
 */
export function createTailoredJob(
  vault: Vault,
  template: Template,
  baseJob: Job,
  proposal: Proposal,
  decisions: Decisions,
  input: TailoredJobInput
): TailoredJob {
  const base = resolveVariant(template, baseJob);
  const { variant, altUpdates } = applyProposal(
    vault,
    base,
    proposal,
    decisions,
    { id: input.id, name: input.name }
  );
  const isLayoutChanged =
    JSON.stringify(variant.layout) !== JSON.stringify(template.layout);
  const isPageLimitChanged =
    input.pageLimit !== undefined && input.pageLimit !== template.pageLimit;
  const copy =
    isLayoutChanged || isPageLimitChanged
      ? {
          ...duplicateTemplate(
            template,
            input.copyTemplateId,
            `${template.name} (tailored)`
          ),
          layout: variant.layout,
          pageLimit: input.pageLimit ?? template.pageLimit,
        }
      : undefined;
  const target = copy ?? template;
  const { job } = splitVariant(
    { ...variant, tone: input.tone ?? variant.tone, tailor: input.tailor },
    target.id,
    input.createdAt ?? today()
  );
  return {
    job: {
      ...job,
      ...(input.company ? { company: input.company } : {}),
      ...(input.role ? { role: input.role } : {}),
    },
    ...(copy ? { template: copy } : {}),
    altUpdates,
  };
}

/**
 * Numbers the entries that propose something (a change to the item, or to its bullets), in the
 * order the review list shows them (most relevant first). The paper's pins and the list use
 * the same numbers. Items with nothing to review get no number.
 */
export function numberChanges(
  variant: Variant,
  proposal: Proposal
): Map<string, number> {
  const numbers = new Map<string, number>();
  const sorted = [...proposal.items].sort((a, b) => b.relevance - a.relevance);
  for (const entry of sorted) {
    const hasBullets = proposal.bullets.some((b) => b.itemId === entry.itemId);
    if (describeItemChange(variant, entry).hasChange || hasBullets) {
      numbers.set(entry.itemId, numbers.size + 1);
    }
  }
  return numbers;
}

/**
 * What to remember about a tailoring run on the variant it made: the job's requirements, the
 * gaps, and the flagged rewordings that were accepted by hand (the checker could not confirm
 * them). `at` is "YYYY-MM-DD".
 */
export function buildTailorRecord(
  requirements: Requirements,
  proposal: Proposal,
  decisions: Decisions,
  at: string
): TailorRecord {
  return {
    at,
    jobTitle: requirements.jobTitle,
    requirements,
    gaps: proposal.gaps,
    acceptedFlagged: proposal.bullets.flatMap((bullet) => {
      const decision = decisions.bullets[bullet.bulletId];
      return bullet.rewrite &&
        decision?.isAccepted &&
        decision.isRewriteAccepted &&
        !canAutoAccept(bullet.flags)
        ? [
            {
              bulletId: bullet.bulletId,
              wording: bullet.rewrite.wording,
              text: bullet.rewrite.text,
              flags: bullet.flags ?? [],
            },
          ]
        : [];
    }),
  };
}
