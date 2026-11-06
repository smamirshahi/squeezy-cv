/** The AI services the app can use. Add a provider here, in `server/ai/ai-registry.ts` and in `ai-provider.ts`. */
export const AI_PROVIDER_IDS = ["claude", "gemini", "groq", "ollama"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

/** What the AI is used for; the user picks a provider for each */
export const AI_TASKS = ["tailor", "import", "hide"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TASK_LABELS: Record<AiTask, string> = {
  tailor: "Tailor to a job ad",
  import: "Sort pasted CV text",
  hide: "Pick what to hide",
};

export type AiChoice = Record<AiTask, AiProviderId>;

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;

  /** Online: text is sent to a company over the internet. Offline: it stays on this computer. */
  isOnline: boolean;

  /** Who receives the text: a company's name, or "this computer" */
  recipient: string;

  /** One line on cost and where text goes */
  detail: string;

  /** A caution to show with the provider (free tiers may train on what they receive) */
  warning?: string;
}

export const AI_PROVIDER_INFO: Record<AiProviderId, AiProviderInfo> = {
  claude: {
    id: "claude",
    label: "Claude",
    isOnline: true,
    recipient: "Anthropic",
    detail: "Sent to Anthropic. Billed per use.",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    isOnline: true,
    recipient: "Google",
    detail: "Sent to Google. Has a free tier.",
    warning:
      "Free tiers may use what you send to improve Google's models. Use Ollama for anything sensitive.",
  },
  groq: {
    id: "groq",
    label: "Groq",
    isOnline: true,
    recipient: "Groq",
    detail: "Sent to Groq. Has a free tier.",
    warning:
      "Free tiers may keep or use what you send. Check Groq's data terms, and use Ollama for anything sensitive.",
  },
  ollama: {
    id: "ollama",
    label: "Ollama",
    isOnline: false,
    recipient: "this computer",
    detail: "Runs on this computer. Nothing leaves it. Free.",
  },
};

export function isAiProviderId(value: unknown): value is AiProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(String(value));
}
