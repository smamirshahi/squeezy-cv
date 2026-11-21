// Checks the AI price list against the providers' pages (#562). Run: pnpm exec tsx scripts/check-ai-prices.ts
// Exit code 0: every model is confirmed. 1: something needs a look (the report says what).
// With REPORT_FILE set, the report is also written there (the monthly workflow uses it).
import { writeFileSync } from "node:fs";
import { PRICES_CHECKED_ON } from "@shared/ai/pricing";
import {
  PRICE_PAGES,
  PriceSource,
  plainText,
  sourceOf,
  unconfirmedModels,
} from "@shared/ai/price-check";

const TIMEOUT_MS = 30_000;

async function fetchText(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (price check)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? plainText(await response.text()) : undefined;
  } catch {
    return undefined;
  }
}

const pages: Partial<Record<PriceSource, string>> = {};
const unreadable: string[] = [];
for (const [source, url] of Object.entries(PRICE_PAGES)) {
  const text = await fetchText(url);
  if (text === undefined) {
    unreadable.push(url);
  } else {
    pages[source as PriceSource] = text;
  }
}

const unconfirmed = unconfirmedModels(pages).filter(
  (model) => !unreadable.includes(PRICE_PAGES[sourceOf(model)])
);
const lines: string[] = [];
if (unreadable.length > 0) {
  lines.push(
    "Pages that could not be read:",
    ...unreadable.map((url) => `- ${url}`)
  );
}
if (unconfirmed.length > 0) {
  lines.push(
    "Models whose price the page no longer shows next to the model's name:",
    ...unconfirmed.map(
      (model) => `- ${model} (${PRICE_PAGES[sourceOf(model)]})`
    )
  );
}
const report =
  lines.length === 0
    ? `All prices confirmed (list last checked ${PRICES_CHECKED_ON}).`
    : [
        `The price list in src/shared/ai/pricing.ts (last checked ${PRICES_CHECKED_ON}) needs a look:`,
        ...lines,
        "Open the pages, update the prices and PRICES_CHECKED_ON, and release.",
      ].join("\n");

console.log(report);
if (process.env.REPORT_FILE) {
  writeFileSync(process.env.REPORT_FILE, `${report}\n`);
}
process.exit(lines.length === 0 ? 0 : 1);
