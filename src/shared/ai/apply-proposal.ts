import { Proposal } from "@custom-types/tailor-types";
import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { canAutoAccept } from "@shared/ai/guardrails";

/** What the user has decided about the proposal. Nothing is applied that was not accepted. */
export interface Decisions {
  /** Apply the suggestion for this item (shown or hidden, highlight, position) */
  items: Record<string, { isAccepted: boolean }>;

  /** By bullet id: apply showing/hiding, and separately the rewording */
  bullets: Record<string, { isAccepted: boolean; isRewriteAccepted: boolean }>;
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
  };
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
