import { personalOf } from "@shared/ai/redact-personal";
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";
import {
  MAX_REWORD_REQUIREMENTS,
  RawRewordSchema,
  RewordRequest,
  RewordResult,
} from "@custom-types/reword-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient, AiError } from "@server/ai/ai-types";
import {
  ItemNotFoundError,
  NothingToWorkFromError,
} from "@server/ai/generate-bullets";

/** Fields the AI may reword: free texts only, never names, dates or links */
const REWORDABLE_FIELDS = ["description", "text"];

/**
 * Shortens, lengthens or fits to the job's keywords ONE text of an item (the summary, an
 * experience or education description). The model sees that text and the item's other fields
 * as context (no profile; scrubbed like tailoring). The answer is checked against the
 * original with `checkRewrite` and the flags are always recomputed here. Nothing is applied.
 */
export async function rewordText(
  ai: AiClient,
  vault: Vault,
  request: RewordRequest,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<RewordResult> {
  const item = vault.sections
    .flatMap((section) => section.items)
    .find((candidate) => candidate.id === request.itemId);
  if (!item) {
    throw new ItemNotFoundError("That item is not in the saved CV.");
  }
  if (!REWORDABLE_FIELDS.includes(request.field)) {
    throw new NothingToWorkFromError("That part cannot be reworded.");
  }
  const original = (item.fields[request.field] ?? "").trim();
  if (original === "") {
    throw new NothingToWorkFromError(
      "There is no saved text to reword. Write it in the vault and save first."
    );
  }
  const context = Object.fromEntries(
    Object.entries(item.fields).filter(([key]) => key !== request.field)
  );
  const raw = await ai.generate({
    promptName: "reword-text",
    input: JSON.stringify({
      mode: request.mode,
      text: original,
      item: context,
      requirements: (request.requirements ?? []).slice(
        0,
        MAX_REWORD_REQUIREMENTS
      ),
    }),
    schema: RawRewordSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
  });
  const text = raw.text.trim();
  if (text === "") {
    throw new AiError("invalid_output", "The model returned no text.");
  }
  return {
    itemId: item.id,
    field: request.field,
    text,
    flags: describeFlags(
      checkRewrite(text, [original, ...Object.values(context)]).flags
    ),
  };
}
