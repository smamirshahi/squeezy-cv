import Anthropic from "@anthropic-ai/sdk";
import { ValidationError } from "runtypes";
import { AiConfig, redact } from "@server/ai/ai-config";
import {
  AiClient,
  AiError,
  ChatMessage,
  GenerateRequest,
  MessageSender,
} from "@server/ai/ai-types";
import { loadPrompt } from "@server/ai/prompts";

const DEFAULT_ATTEMPTS = 3;
const MAX_OUTPUT_TOKENS = 16_000;

/** The JSON object in a reply, tolerating a code fence or a sentence around it */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new SyntaxError("The reply contains no JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function describeProblem(error: unknown): string {
  if (error instanceof ValidationError) {
    return `It does not match the required structure: ${error.message}`;
  }
  return error instanceof Error ? error.message : "It is not valid JSON.";
}

/**
 * Asks the model for JSON, checks it against the schema, and when it is wrong tells the
 * model what was wrong and asks again, up to `maxAttempts` in total. Output that never
 * validates is rejected, never passed on.
 */
export class ClaudeAiClient implements AiClient {
  constructor(
    private readonly send: MessageSender,
    private readonly apiKey?: string
  ) {}

  async generate<T>(request: GenerateRequest<T>): Promise<T> {
    const attempts = request.maxAttempts ?? DEFAULT_ATTEMPTS;
    const system = loadPrompt(request.promptName);
    const messages: ChatMessage[] = [{ role: "user", content: request.input }];
    let lastProblem = "";

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const result = await this.send(system, messages);
      if (result.stopReason === "refusal") {
        throw new AiError("refused", "The model declined this request.");
      }
      if (result.stopReason === "max_tokens") {
        throw new AiError(
          "truncated",
          "The answer was cut off. Try with less text."
        );
      }
      try {
        return request.schema.check(extractJson(result.text));
      } catch (error) {
        lastProblem = redact(describeProblem(error), this.apiKey);
        messages.push(
          { role: "assistant", content: result.text },
          {
            role: "user",
            content: `That reply was not usable. ${lastProblem}\nReply again with only the corrected JSON object.`,
          }
        );
      }
    }
    throw new AiError(
      "invalid_output",
      `The model did not return valid output after ${attempts} attempts. Last problem: ${lastProblem}`
    );
  }
}

/** The real sender: Anthropic's SDK. Errors become `AiError`s with the key removed. */
export function createAnthropicSender(config: AiConfig): MessageSender {
  const client = new Anthropic({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
  });
  return async (system, messages) => {
    try {
      const response = await client.messages.create({
        model: config.model,
        // eslint-disable-next-line @typescript-eslint/naming-convention -- API field name
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
        thinking: { type: "adaptive" },
      });
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      const reason = response.stop_reason;
      return {
        text,
        stopReason:
          reason === "end_turn" ||
          reason === "max_tokens" ||
          reason === "refusal"
            ? reason
            : "other",
      };
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new AiError("timeout", "The AI service took too long to answer.");
      }
      const detail =
        error instanceof Anthropic.APIError
          ? `The AI service answered ${error.status ?? "with an error"}: ${error.message}`
          : "The AI service could not be reached.";
      throw new AiError("api_error", redact(detail, config.apiKey));
    }
  };
}

/** The client for this configuration, or an `AiError` "not_configured" when there is no key */
export function createAiClient(config: AiConfig): AiClient {
  if (!config.apiKey) {
    throw new AiError(
      "not_configured",
      "No API key. Set ANTHROPIC_API_KEY in .env (see .env.example)."
    );
  }
  return new ClaudeAiClient(createAnthropicSender(config), config.apiKey);
}
