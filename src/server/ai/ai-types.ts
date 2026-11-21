import { AiUsage } from "@shared/ai/pricing";
import { AiEffort } from "@shared/ai/providers";
import { PersonalData } from "@shared/ai/redact-personal";

/** What a runtypes schema offers: throws if the value does not match */
interface Schema<T> {
  check: (value: unknown) => T;
}

export type AiErrorCode =
  /** No API key is set */
  | "not_configured"
  | "timeout"
  | "api_error"
  /** The model declined (safety) */
  | "refused"
  /** The answer was cut off at the token limit */
  | "truncated"
  /** Still not valid after all attempts */
  | "invalid_output";

/** A failure of an AI call. The message never contains the API key. */
export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface GenerateRequest<T> {
  /** Name of a prompt file in `ai/prompts/` used as the system prompt */
  promptName: string;

  /** The task, including the data it works on */
  input: string;

  /** The answer must be JSON that passes this schema */
  schema: Schema<T>;

  /** Total tries including the first (default 3) */
  maxAttempts?: number;

  /**
   * Whose details to keep out of everything sent to the model. They are replaced by
   * placeholders on the way out and put back in the answer. Leave it out only for text that
   * cannot contain personal data.
   */
  personal?: PersonalData;

  /** Called with a plain-language warning, e.g. when the model altered a placeholder */
  onWarning?: (message: string) => void;

  /** Called after every attempt with the tokens it used, so the cost can be added up (#551) */
  onUsage?: (usage: AiUsage) => void;
}

export interface AiClient {
  generate<T>(request: GenerateRequest<T>): Promise<T>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SenderResult {
  text: string;
  stopReason: "end_turn" | "max_tokens" | "refusal" | "other";

  /** What the provider says it counted; missing when it does not say */
  usage?: AiUsage;
}

/** What a call may ask for besides the messages; a sender uses what its provider understands */
interface SendOptions {
  /** How hard to think (Claude only, #551) */
  effort?: AiEffort;
}

/** One call to the model. The only part that touches the network, so tests can replace it. */
export type MessageSender = (
  system: string,
  messages: ChatMessage[],
  options?: SendOptions
) => Promise<SenderResult>;
