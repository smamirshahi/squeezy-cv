/** The AI services the app can use. Add a provider here, in `server/ai/ai-registry.ts` and in `ai-provider.ts`. */
export const AI_PROVIDER_IDS = ["claude", "gemini", "groq", "ollama"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

/** What the AI is used for; the user picks a provider for each */
export const AI_TASKS = ["tailor", "import", "hide", "chat", "place"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TASK_LABELS: Record<AiTask, string> = {
  tailor: "Tailor to a job ad",
  import: "Sort pasted CV text",
  hide: "Pick what to hide",
  chat: "Chat edits",
  place: "Place unsorted items",
};

/** What each task does and what it sends, for the Settings page (#271) */
export const AI_TASK_DESCRIPTIONS: Record<
  AiTask,
  { what: string; sends: string }
> = {
  tailor: {
    what: "Reads a job advert and proposes what to show, hide and reword for it. Also scores items against an advert. Nothing changes until you accept.",
    sends:
      "The advert and the text of your saved entries (titles, bullets, dates), masked: no name or contact details, employers and schools as [Company n] / [School n].",
  },
  import: {
    what: "Sorts CV text you paste (or take from a PDF) into vault sections and items. You review it before anything is added.",
    sends:
      "The whole text you paste, including your name and contact details. It is not masked because the text is the personal data.",
  },
  hide: {
    what: "When the CV is too long, suggests which items to hide to fit the page limit, with a reason for each.",
    sends:
      "Only short labels of the visible items (job titles), the lines each would save and how relevant it is. No vault text and no profile data.",
  },
  chat: {
    what: "Turns what you type in Chat into edits you approve first (hide, move, reword). Also makes bullets from an item's description.",
    sends:
      "Your message and your saved entries with short ids, masked like tailoring. Never the profile.",
  },
  place: {
    what: "Suggests which section each item in Unsorted belongs to.",
    sends:
      "The text of the unsorted items and the names of your sections, masked like tailoring.",
  },
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
