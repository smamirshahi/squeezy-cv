import { randomUUID } from "node:crypto";
import { RawImportSchema } from "@custom-types/import-types";
import { AiClient } from "@server/ai/ai-types";
import { normaliseRawImport } from "@shared/vault/normalise-raw-import";
import { ImportOutcome, importToVault } from "@shared/vault/import-from-text";

/**
 * Asks the model to sort pasted CV text into the vault structure, then checks the answer
 * against the text. There is no `personal` here on purpose: the pasted text is the personal
 * data. With Claude all of it goes to Anthropic (the UI says so first); with Ollama it stays
 * on this computer.
 */
export async function importCv(
  ai: AiClient,
  text: string
): Promise<ImportOutcome> {
  const raw = await ai.generate({
    promptName: "import-cv",
    input: text,
    schema: {
      check: (value) => RawImportSchema.check(normaliseRawImport(value)),
    },
  });
  return importToVault(raw, text, randomUUID);
}
