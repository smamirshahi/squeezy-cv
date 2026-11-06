import { AiConfig } from "@server/ai/ai-config";
import { AiError, MessageSender } from "@server/ai/ai-types";

const HTTP_NOT_FOUND = 404;

interface OllamaChatResponse {
  message?: { content?: string };
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Ollama field name
  done_reason?: string;
  error?: string;
}

/**
 * The sender for a local Ollama (https://ollama.com): no key, no cost, and the CV never
 * leaves this machine. It asks for JSON mode and a context window big enough for a CV.
 */
export function createOllamaSender(
  config: AiConfig,
  fetchImpl: typeof fetch = fetch
): MessageSender {
  const { url, model, numCtx } = config.ollama;
  return async (system, messages) => {
    let response: Response;
    try {
      response = await fetchImpl(`${url}/api/chat`, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Ollama field name
          stream: false,
          format: "json",
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Ollama option name
          options: { num_ctx: numCtx },
          messages: [{ role: "system", content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AiError(
          "timeout",
          "The local model took too long to answer. Try a smaller model, or raise AI_TIMEOUT_MS."
        );
      }
      throw new AiError(
        "api_error",
        `Ollama is not running at ${url}. Start it (ollama serve) and try again.`
      );
    }

    let payload: OllamaChatResponse = {};
    try {
      payload = (await response.json()) as OllamaChatResponse;
    } catch {
      // handled below through the status
    }
    if (!response.ok) {
      const detail = payload.error ?? `status ${response.status}`;
      throw new AiError(
        "api_error",
        response.status === HTTP_NOT_FOUND
          ? `Ollama does not have the model "${model}". Run: ollama pull ${model}`
          : `Ollama answered with an error: ${detail}`
      );
    }
    return {
      text: payload.message?.content ?? "",
      stopReason: payload.done_reason === "length" ? "max_tokens" : "end_turn",
    };
  };
}
