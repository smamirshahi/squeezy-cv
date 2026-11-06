import { Vault } from "@custom-types/vault-types";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { loadPrompt } from "@server/ai/prompts";
import { TailorInput, tailor } from "@server/ai/tailor";
import { scrub } from "@shared/ai/redact-personal";

/** One message that would be sent to the model, exactly as it would leave this computer */
export interface PreviewedCall {
  promptName: string;
  system: string;
  input: string;
}

class StopPreview extends Error {}

/**
 * What tailoring would send, without sending anything: runs the real tailoring code with a
 * client that only records each request (after the same personal-data scrubbing the real
 * client applies) and stops at the second call. The second call's input is built from a
 * stand-in for the answer to the first, so the CV part is exact and the requirements part is
 * a placeholder.
 */
export async function previewTailorRequest(
  vault: Vault,
  input: TailorInput,
  options: { isMaskingOrganisations?: boolean } = {}
): Promise<PreviewedCall[]> {
  const calls: PreviewedCall[] = [];
  const recorder: AiClient = {
    generate<T>(request: GenerateRequest<T>): Promise<T> {
      const personal = request.personal ?? {
        profile: { fullName: "" },
        links: [],
      };
      calls.push({
        promptName: request.promptName,
        system: scrub(loadPrompt(request.promptName), personal).text,
        input: scrub(request.input, personal).text,
      });
      if (calls.length === 1) {
        return Promise.resolve({
          jobTitle: "(answer of the first call)",
          mustHave: [],
          niceToHave: [],
          keywords: [],
        } as T);
      }
      return Promise.reject(new StopPreview());
    },
  };
  try {
    await tailor(recorder, vault, input, options);
  } catch (error) {
    if (!(error instanceof StopPreview)) {
      throw error;
    }
  }
  return calls;
}
