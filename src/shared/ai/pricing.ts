import { AiProviderId } from "@shared/ai/providers";

/**
 * What an AI request costs, worked out without calling anything (#551). Pure, so the server
 * and the browser version share it. Prices are list prices in US dollars per million tokens,
 * copied from the providers' pages on 2026-11-21 and to be kept in step with them:
 * https://platform.claude.com/docs/en/about-claude/pricing,
 * https://ai.google.dev/gemini-api/docs/pricing and https://console.groq.com/docs/models
 */
export interface ModelPrice {
  /** Dollars per million input tokens */
  input: number;

  /** Dollars per million output tokens (thinking counts as output) */
  output: number;

  /** The provider has a free tier for this model: requests within its limits cost nothing */
  hasFreeTier?: boolean;

  /** A price change that is already announced: from this day (YYYY-MM-DD) these prices apply */
  later?: { from: string; input: number; output: number };
}

/**
 * The day the prices below were last checked against the providers' pages (YYYY-MM-DD). Shown
 * to the user, and `pricing.test.ts` fails when it is older than `PRICES_MAX_AGE_DAYS`: update
 * it together with the prices.
 */
export const PRICES_CHECKED_ON = "2026-11-21";

/** How long the prices may go unchecked before the test asks for a new look */
export const PRICES_MAX_AGE_DAYS = 90;

const GEMINI_FLASH_NOW: ModelPrice = {
  input: 0.75,
  output: 3.75,
  hasFreeTier: true,
  later: { from: "2027-01-01", input: 1.5, output: 7.5 },
};

/**
 * Known models: Claude, Gemini and Groq. A model that is not here has no price (Groq's Llama
 * models are "contact sales"): the app says so and never guesses.
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-fable-5-2": { input: 8, output: 40 },
  "gemini-3.8-flash": GEMINI_FLASH_NOW,
  "gemini-3.6-flash": GEMINI_FLASH_NOW,
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5, hasFreeTier: true },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5, hasFreeTier: true },
  "gemini-3-flash-preview": { input: 0.5, output: 3, hasFreeTier: true },
  // Above 200k tokens of prompt the price is higher; a CV never gets there
  "gemini-3.1-pro-preview": { input: 2, output: 12 },
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
  "openai/gpt-oss-20b": { input: 0.075, output: 0.3 },
  "qwen/qwen3.8-27b": { input: 0.8, output: 4 },
};

const TOKENS_PER_MILLION = 1_000_000;

/** English text and JSON average a little under 4 characters per token; 3.5 errs on the high side */
const CHARACTERS_PER_TOKEN = 3.5;

/** How many tokens a text is about (a local estimate, good to roughly 20%) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARACTERS_PER_TOKEN);
}

/**
 * How long the answer usually is, in tokens, including the model's thinking. The length is not
 * known before the call, so this is a range per prompt: the low end is a quick answer, the high
 * end a long one. Retries (a bad answer is asked again) are not included.
 */
const OUTPUT_TOKENS: Record<string, { low: number; high: number }> = {
  "rewrite-bullet": { low: 300, high: 2000 },
  "reword-text": { low: 300, high: 2000 },
  "generate-bullets": { low: 500, high: 3000 },
  "score-section": { low: 600, high: 4000 },
  "extract-requirements": { low: 500, high: 3000 },
  "ats-wording": { low: 600, high: 3500 },
  "chat-edit": { low: 600, high: 4000 },
  "pick-hide": { low: 300, high: 2000 },
  "place-items": { low: 300, high: 2000 },
  // The answer is the whole CV as JSON
  "import-cv": { low: 2000, high: 12_000 },
};
const DEFAULT_OUTPUT_TOKENS = { low: 500, high: 4000 };

/** The messages of one request, as the model would receive them (what the Send to AI window holds) */
export interface PricedCall {
  promptName: string;
  system: string;
  input: string;
}

export type CostEstimate =
  /** A model on this computer: nothing to pay */
  | { kind: "free"; inputTokens: number }
  /** Hosted, but the app has no price for this model */
  | { kind: "unknown"; inputTokens: number }
  | {
      kind: "priced";
      inputTokens: number;
      /** What is sent (known up to the token estimate) */
      inputUsd: number;

      /** The answer: a short one and a long one */
      outputLowUsd: number;
      outputHighUsd: number;

      /** Input plus a short answer, and input plus a long answer */
      lowUsd: number;
      highUsd: number;

      /** Within the provider's free limits this costs nothing */
      hasFreeTier: boolean;
    };

/** Tokens and dollars of what was really used, as the provider counted them */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

/** The tokens a request used and who counted them: what the server tells the app after each AI request */
export interface AiUsageReport extends AiUsage {
  provider: AiProviderId;
  model?: string;
}

/** The response header that carries an `AiUsageReport` as JSON (server and browser version alike) */
export const AI_USAGE_HEADER = "x-ai-usage";

/** The report in a header value, or undefined when it is missing or not a report */
export function parseUsageHeader(
  value: string | null | undefined
): AiUsageReport | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as Partial<AiUsageReport>;
    return typeof parsed.provider === "string" &&
      typeof parsed.inputTokens === "number" &&
      typeof parsed.outputTokens === "number"
      ? (parsed as AiUsageReport)
      : undefined;
  } catch {
    return undefined;
  }
}

/** The price of a model today (an announced change applies from its day on), or undefined when it is not known */
export function priceOf(
  model: string | undefined,
  now: Date = new Date()
): ModelPrice | undefined {
  const price = model ? MODEL_PRICES[model] : undefined;
  if (price?.later && now.toISOString().slice(0, 10) >= price.later.from) {
    return { ...price, ...price.later, later: undefined };
  }
  return price;
}

function dollars(price: ModelPrice, usage: AiUsage): number {
  return (
    (usage.inputTokens * price.input + usage.outputTokens * price.output) /
    TOKENS_PER_MILLION
  );
}

/** What this request will probably cost, as a range; "free" for a local model, "unknown" without a price */
export function estimateRequestCost(
  provider: AiProviderId,
  model: string | undefined,
  calls: PricedCall[],
  now: Date = new Date()
): CostEstimate {
  const inputTokens = calls.reduce(
    (sum, call) =>
      sum + estimateTokens(call.system) + estimateTokens(call.input),
    0
  );
  if (provider === "ollama") {
    return { kind: "free", inputTokens };
  }
  const price = priceOf(model, now);
  if (!price) {
    return { kind: "unknown", inputTokens };
  }
  let outputLow = 0;
  let outputHigh = 0;
  for (const call of calls) {
    const range = OUTPUT_TOKENS[call.promptName] ?? DEFAULT_OUTPUT_TOKENS;
    outputLow += range.low;
    outputHigh += range.high;
  }
  const inputUsd = dollars(price, { inputTokens, outputTokens: 0 });
  const outputLowUsd = dollars(price, {
    inputTokens: 0,
    outputTokens: outputLow,
  });
  const outputHighUsd = dollars(price, {
    inputTokens: 0,
    outputTokens: outputHigh,
  });
  return {
    kind: "priced",
    inputTokens,
    hasFreeTier: price.hasFreeTier === true,
    inputUsd,
    outputLowUsd,
    outputHighUsd,
    lowUsd: inputUsd + outputLowUsd,
    highUsd: inputUsd + outputHighUsd,
  };
}

/** What a finished request cost, or undefined when the model has no price */
export function actualCostUsd(
  provider: AiProviderId,
  model: string | undefined,
  usage: AiUsage,
  now: Date = new Date()
): number | undefined {
  if (provider === "ollama") {
    return 0;
  }
  const price = priceOf(model, now);
  return price ? dollars(price, usage) : undefined;
}

const CENTS = 100;
const SMALL_AMOUNT = 0.1;
const MIN_SHOWN_CENTS = 0.1;

/** "0.6¢", "4¢" or "$1.20": small amounts in cents, because most requests cost less than a dime */
export function formatUsd(amount: number): string {
  if (amount === 0) {
    return "0¢";
  }
  if (amount < SMALL_AMOUNT) {
    const cents = amount * CENTS;
    return `${cents < MIN_SHOWN_CENTS ? "<0.1" : cents.toFixed(1).replace(/\.0$/, "")}¢`;
  }
  if (amount < 1) {
    return `${Math.round(amount * CENTS)}¢`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * The cost in plain words: "1 US cent" and what it can reach ("3 US cents") when the answer is long.
 * Whole cents (at least 1) under a dollar; dollars and cents above.
 */
export function costHeadline(
  low: number,
  high: number
): { main: string; upTo?: string } {
  function plain(amount: number): string {
    if (amount >= 1) {
      return shortCost(amount);
    }
    const cents = Math.max(1, Math.round(amount * CENTS));
    return cents === 1 ? "1 US cent" : `${cents} US cents`;
  }
  const main = plain(low);
  const upTo = plain(high);
  return upTo === main ? { main } : { main, upTo };
}

/** "1¢", "12¢" or "$1.20": whole cents (at least 1) under a dollar; for a button label */
export function shortCost(amount: number): string {
  return amount >= 1
    ? `$${amount.toFixed(2)}`
    : `${Math.max(1, Math.round(amount * CENTS))}¢`;
}

/** Tokens per word of English text (a word is about 1.3 tokens) */
const TOKENS_PER_WORD = 1.3;
const ROUND_WORDS_TO = 100;
const ROUND_SMALL_WORDS_TO = 10;

/** "1,300" for a token count: the number of words, rounded so it does not look exact */
export function wordCount(tokens: number): string {
  const words = tokens / TOKENS_PER_WORD;
  const step = words >= ROUND_WORDS_TO ? ROUND_WORDS_TO : ROUND_SMALL_WORDS_TO;
  const rounded = Math.max(step, Math.round(words / step) * step);
  return rounded.toLocaleString("en-US");
}

/** Friendly names for the models people see most; any other model shows its id */
const MODEL_LABELS: Record<string, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-opus-5-5": "Claude Opus 5.5",
  "claude-opus-5": "Claude Opus 5",
  "claude-opus-4-8": "Claude Opus 4.8",
  "claude-fable-5-2": "Claude Fable 5.2",
};

export function modelLabel(model: string | undefined): string {
  return model ? (MODEL_LABELS[model] ?? model) : "its usual model";
}

/** The models with a known price that belong to a provider, for the "Change" list */
export function pricedModelsOf(provider: AiProviderId): string[] {
  const belongs: Record<AiProviderId, (id: string) => boolean> = {
    claude: (id) => id.startsWith("claude-"),
    gemini: (id) => id.startsWith("gemini-"),
    groq: (id) => id.includes("/"),
    ollama: () => false,
  };
  return Object.keys(MODEL_PRICES).filter(belongs[provider]);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "21 Nov 2026" for a YYYY-MM-DD day */
export function formatPriceDate(day: string = PRICES_CHECKED_ON): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

const THOUSAND = 1000;

/** "850" or "1.2k" */
export function formatTokens(count: number): string {
  return count < THOUSAND
    ? String(count)
    : `${(count / THOUSAND).toFixed(1).replace(/\.0$/, "")}k`;
}
