import { MODEL_PRICES, modelLabel, priceOf } from "@shared/ai/pricing";

/**
 * Checks the price list against the text of the providers' price pages (#562). Pure: the script
 * `scripts/check-ai-prices.ts` fetches the pages, this decides. It only confirms; a model it
 * cannot confirm is a reason for a person to look, never a reason to change a price.
 */
export type PriceSource = "anthropic" | "google" | "groq";

export const PRICE_PAGES: Record<PriceSource, string> = {
  anthropic: "https://platform.claude.com/docs/en/about-claude/pricing",
  google: "https://ai.google.dev/gemini-api/docs/pricing",
  groq: "https://console.groq.com/docs/models",
};

/** How many characters after a model's name its two prices must show up in */
const WINDOW = 700;

/** Which page lists a model */
export function sourceOf(model: string): PriceSource {
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  return model.startsWith("gemini-") ? "google" : "groq";
}

/** A page as plain text: no scripts, styles or tags, one space between words */
export function plainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** How a price may be written on a page: 2 as "$2" or "$2.00", 0.1 as "$0.1" or "$0.10" */
function mentions(text: string, amount: number): boolean {
  const written = new Set([String(amount), amount.toFixed(2)]);
  return [...written].some((value) =>
    // Not followed by more digits: "$2" must not match inside "$2.50" or "$20"
    new RegExp(`\\$\\s?${value.replace(".", "\\.")}(?!\\d|\\.\\d)`).test(text)
  );
}

/** Whether the page names the model with both of its prices right after the name */
export function isConfirmed(
  text: string,
  model: string,
  now: Date = new Date()
): boolean {
  const price = priceOf(model, now);
  if (!price) {
    return false;
  }
  const lower = text.toLowerCase();
  return [model, modelLabel(model)].some((name) => {
    const needle = name.toLowerCase();
    for (
      let at = lower.indexOf(needle);
      at !== -1;
      at = lower.indexOf(needle, at + 1)
    ) {
      const window = text.slice(at, at + WINDOW);
      if (mentions(window, price.input) && mentions(window, price.output)) {
        return true;
      }
    }
    return false;
  });
}

/** The models of the list that the page texts do not confirm (a page that is missing confirms nothing) */
export function unconfirmedModels(
  pages: Partial<Record<PriceSource, string>>,
  now: Date = new Date()
): string[] {
  return Object.keys(MODEL_PRICES).filter((model) => {
    const text = pages[sourceOf(model)];
    return text === undefined || !isConfirmed(text, model, now);
  });
}
