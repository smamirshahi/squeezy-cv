import { AiUsageReport, actualCostUsd } from "@shared/ai/pricing";
import { AiProviderId, isAiProviderId } from "@shared/ai/providers";

/**
 * What the AI requests of this browser used (#551): when, what for, which model, the tokens and
 * the cost. Kept in this browser's localStorage only (never sent anywhere, never part of a
 * backup), newest first, so the user can see what AI costs and clear it.
 */
export interface AiUsageEntry {
  /** ISO time of the request */
  at: string;

  /** What the request was for, in words ("Pick what to hide") */
  what: string;
  provider: AiProviderId;
  model?: string;
  inputTokens: number;
  outputTokens: number;

  /** Dollars; missing when the model has no known price */
  costUsd?: number;
}

const STORAGE_KEY = "squeezy-cv-ai-usage";
const MAX_ENTRIES = 200;
const CHANGE_EVENT = "squeezy-cv-ai-usage-changed";
const RECORDED_EVENT = "squeezy-cv-ai-usage-recorded";

function isEntry(value: unknown): value is AiUsageEntry {
  const entry = value as Partial<AiUsageEntry> | null;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.at === "string" &&
    typeof entry.what === "string" &&
    isAiProviderId(entry.provider) &&
    typeof entry.inputTokens === "number" &&
    typeof entry.outputTokens === "number"
  );
}

/** The saved entries, newest first (empty when storage is blocked or holds something else) */
export function readAiUsage(): AiUsageEntry[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function write(entries: AiUsageEntry[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES))
    );
  } catch {
    // Storage may be blocked; the cost is still shown once, just not remembered
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Adds one finished request to the log and gives the entry back (with its cost) */
export function recordAiUsage(
  what: string,
  report: AiUsageReport,
  now: Date = new Date()
): AiUsageEntry {
  const entry: AiUsageEntry = {
    at: now.toISOString(),
    what,
    provider: report.provider,
    model: report.model,
    inputTokens: report.inputTokens,
    outputTokens: report.outputTokens,
    costUsd: actualCostUsd(report.provider, report.model, report),
  };
  write([entry, ...readAiUsage()]);
  window.dispatchEvent(
    new CustomEvent<AiUsageEntry>(RECORDED_EVENT, { detail: entry })
  );
  return entry;
}

export function clearAiUsage(): void {
  write([]);
}

/** Calls `listener` whenever the log changes (also from another tab); gives back the way to stop */
export function subscribeAiUsage(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Calls `listener` with each request that finishes in this tab (not with the log being cleared or changed elsewhere) */
export function onAiUsageRecorded(
  listener: (entry: AiUsageEntry) => void
): () => void {
  function handle(event: Event): void {
    listener((event as CustomEvent<AiUsageEntry>).detail);
  }
  window.addEventListener(RECORDED_EVENT, handle);
  return () => window.removeEventListener(RECORDED_EVENT, handle);
}

/** The dollars spent in the calendar month of `now`, and how many of those requests had no price */
export function monthTotal(
  entries: AiUsageEntry[],
  now: Date = new Date(),
  provider?: AiProviderId
): { usd: number; unpriced: number; count: number } {
  let usd = 0;
  let unpriced = 0;
  let count = 0;
  for (const entry of entries) {
    const at = new Date(entry.at);
    if (provider && entry.provider !== provider) {
      continue;
    }
    if (
      at.getFullYear() !== now.getFullYear() ||
      at.getMonth() !== now.getMonth()
    ) {
      continue;
    }
    count += 1;
    if (entry.costUsd === undefined) {
      unpriced += 1;
    } else {
      usd += entry.costUsd;
    }
  }
  return { usd, unpriced, count };
}
