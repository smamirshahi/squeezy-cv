import { personalOf } from "@shared/ai/redact-personal";
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";
import {
  REWRITE_WORDING,
  RawRewriteSchema,
  RewriteRequest,
  RewriteResult,
} from "@custom-types/rewrite-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient, AiError } from "@server/ai/ai-types";

/** Thrown when the bullet is not in the saved CV */
export class BulletNotFoundError extends Error {}

/**
 * Rewords one bullet (shorter, longer or more formal). The model sees the item as context
 * (no profile; scrubbed like tailoring); the result is checked with `checkRewrite` and the
 * flags are always recomputed here. Nothing is applied: the user accepts it, and it is then only
 * stored as an alternative wording.
 */
export async function rewriteBullet(
  ai: AiClient,
  vault: Vault,
  request: RewriteRequest,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<RewriteResult> {
  const item = vault.sections
    .flatMap((section) => section.items)
    .find((candidate) => candidate.id === request.itemId);
  const bullet = item?.bullets.find((b) => b.id === request.bulletId);
  if (!item || !bullet) {
    throw new BulletNotFoundError("That bullet is not in the saved CV.");
  }
  const raw = await ai.generate({
    promptName: "rewrite-bullet",
    input: JSON.stringify({
      mode: request.mode,
      bullet: bullet.text,
      item: {
        fields: item.fields,
        tags: item.tags,
        otherBullets: item.bullets
          .filter((b) => b.id !== bullet.id)
          .map((b) => b.text),
      },
      requirements: request.requirements ?? [],
    }),
    schema: RawRewriteSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
  });
  const text = raw.text.trim();
  if (text.length === 0) {
    throw new AiError("invalid_output", "The model returned no text.");
  }
  const sources = [
    bullet.text,
    ...Object.values(item.fields),
    ...item.bullets.map((b) => b.text),
    ...item.tags,
  ];
  return {
    itemId: item.id,
    bulletId: bullet.id,
    wording: REWRITE_WORDING[request.mode],
    text,
    flags: describeFlags(checkRewrite(text, sources).flags),
  };
}
