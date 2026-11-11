import { Masking, MaskTerm } from "@custom-types/masking-types";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { loadPrompt } from "@server/ai/prompts";
import { AiProviderId } from "@shared/ai/providers";
import {
  PersonalData,
  describeMasking,
  scrub,
  suggestMasks,
  withDetectedMasks,
} from "@shared/ai/redact-personal";

/** One message as it would leave this computer: masked, exactly as the model would see it */
interface PreviewedCall {
  promptName: string;
  system: string;
  input: string;
}

/** What the "Send to AI" dialog shows: the messages, what was masked, and what else looks private */
export interface SendPreview {
  provider: AiProviderId;
  calls: PreviewedCall[];
  terms: MaskTerm[];
  suggestions: string[];
}

/** Thrown by the recorder once it has seen the messages, to stop the real code before it asks a model */
export class PreviewStop extends Error {
  constructor(readonly preview: SendPreview) {
    super("Preview only: nothing was sent.");
  }
}

const NO_ONE: PersonalData = { profile: { fullName: "" }, links: [] };

/** The request's personal data with the user's masking added (also when it had none, e.g. a pasted text) */
function withUserMasking(
  personal: PersonalData | undefined,
  masking: Masking | undefined
): PersonalData | undefined {
  if (!masking || (masking.custom.length === 0 && masking.skip.length === 0)) {
    return personal;
  }
  return { ...(personal ?? NO_ONE), masking };
}

/** An AI client that also hides what the user chose to hide (see `Masking`) */
export function maskedClient(
  client: AiClient,
  masking: Masking | undefined
): AiClient {
  if (!masking) {
    return client;
  }
  return {
    generate: (request) =>
      client.generate({
        ...request,
        personal: withUserMasking(request.personal, masking),
      }),
  };
}

/** A client that only records what would be sent; see `createRecorder` */
export interface Recorder extends AiClient {
  /** True once it has thrown `PreviewStop` (the task never finished) */
  readonly isStopped: boolean;

  /** What was recorded so far, for a task that ran to its end with the stand-in answers */
  finish: () => SendPreview;
}

/**
 * A client that only records. It stops (throws `PreviewStop`) at the `callsToRecord`-th call (1 by
 * default); an earlier call is answered with `standIn` so a task that needs the answer of its
 * first call (tailoring) can still reach the call that carries the CV. With `callsToRecord:
 * Infinity` it never stops: the task runs to its end on the stand-in answers (scoring a section
 * in several batches) and `finish()` gives everything it recorded.
 */
export function createRecorder(options: {
  provider: AiProviderId;
  masking?: Masking;
  callsToRecord?: number;
  standIn?: unknown;
}): Recorder {
  const calls: PreviewedCall[] = [];
  const raw: string[] = [];
  let data: PersonalData = NO_ONE;
  let isStopped = false;
  const total = options.callsToRecord ?? 1;

  function finish(): SendPreview {
    const text = raw.join("\n\n");
    return {
      provider: options.provider,
      calls,
      terms: describeMasking(text, data),
      suggestions: suggestMasks(text, data),
    };
  }

  return {
    get isStopped() {
      return isStopped;
    },
    finish,
    generate<T>(request: GenerateRequest<T>): Promise<T> {
      data = withUserMasking(request.personal, options.masking) ?? NO_ONE;
      data = withDetectedMasks(request.input, data);
      calls.push({
        promptName: request.promptName,
        system: scrub(loadPrompt(request.promptName), data).text,
        input: scrub(request.input, data).text,
      });
      raw.push(request.input);
      if (calls.length < total) {
        return Promise.resolve(options.standIn as T);
      }
      isStopped = true;
      return Promise.reject(new PreviewStop(finish()));
    },
  };
}
