import { personalOf } from "@shared/ai/redact-personal";
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";
import {
  BulletsRequest,
  BulletsResult,
  MAX_CURRENT_BULLETS,
  MAX_GENERATED_BULLETS,
  RawBulletsSchema,
} from "@custom-types/bullets-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient, AiError } from "@server/ai/ai-types";

/** Thrown when the item is not in the saved CV */
export class ItemNotFoundError extends Error {}

/** Thrown when there is nothing to work from: no description, or no bullets for a mode that changes them */
export class NothingToWorkFromError extends Error {}

/**
 * Makes bullets from an item's description (or shortens / rewords the job's current ones). The
 * model sees the description and the item's title fields only (no profile; scrubbed like
 * tailoring). Every bullet is checked against the description with `checkRewrite`, and the flags
 * are always recomputed here. Nothing is applied: the user reviews the bullets first.
 */
export async function generateBullets(
  ai: AiClient,
  vault: Vault,
  request: BulletsRequest,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<BulletsResult> {
  const item = vault.sections
    .flatMap((section) => section.items)
    .find((candidate) => candidate.id === request.itemId);
  if (!item) {
    throw new ItemNotFoundError("That item is not in the saved CV.");
  }
  const description = (item.fields.description ?? "").trim();
  if (description === "") {
    throw new NothingToWorkFromError(
      "This item has no description yet. Write one in the vault first."
    );
  }
  const current = (request.current ?? [])
    .slice(0, MAX_CURRENT_BULLETS)
    .map((text) => text.trim())
    .filter((text) => text !== "");
  if (request.mode !== "make" && current.length === 0) {
    throw new NothingToWorkFromError("Make bullets first.");
  }
  const context = Object.fromEntries(
    Object.entries(item.fields).filter(([key]) => key !== "description")
  );
  const raw = await ai.generate({
    promptName: "generate-bullets",
    input: JSON.stringify({
      mode: request.mode,
      description,
      item: context,
      current: request.mode === "make" ? [] : current,
      requirements: request.requirements ?? [],
      // the points the user picked to lean on (any mode)
      ...(request.focus && request.focus.length > 0
        ? { focus: request.focus }
        : {}),
    }),
    schema: RawBulletsSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
  });
  const texts = raw.bullets
    .map((text) => text.trim())
    .filter((text) => text !== "")
    .slice(0, MAX_GENERATED_BULLETS);
  if (texts.length === 0) {
    throw new AiError("invalid_output", "The model returned no bullets.");
  }
  // what the person wrote is the source; the fields are the item's own title, organisation, ...
  const sources = [description, ...Object.values(context), ...current];
  return {
    itemId: item.id,
    bullets: texts.map((text) => ({
      text,
      flags: describeFlags(checkRewrite(text, sources).flags),
    })),
  };
}
