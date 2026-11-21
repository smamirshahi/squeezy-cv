import { describe, expect, it } from "vitest";
import {
  actualCostUsd,
  costHeadline,
  estimateRequestCost,
  formatPriceDate,
  priceOf,
  PRICES_CHECKED_ON,
  PRICES_MAX_AGE_DAYS,
  shortCost,
  wordCount,
} from "@shared/ai/pricing";

const MS_PER_DAY = 86_400_000;

describe("price list", () => {
  it("has been checked recently (update PRICES_CHECKED_ON together with the prices)", () => {
    const age =
      (Date.now() - new Date(PRICES_CHECKED_ON).getTime()) / MS_PER_DAY;
    expect(age).toBeLessThan(PRICES_MAX_AGE_DAYS);
  });

  it("writes the date for people", () => {
    expect(formatPriceDate("2026-11-21")).toBe("21 Nov 2026");
  });

  it("applies an announced price change from its day on", () => {
    const before = priceOf("gemini-3.8-flash", new Date("2026-12-31"));
    const after = priceOf("gemini-3.8-flash", new Date("2027-01-01"));
    expect(before?.input).toBe(0.75);
    expect(after?.input).toBe(1.5);
    expect(after?.output).toBe(7.5);
  });

  it("knows nothing about a model it has no price for", () => {
    expect(priceOf("llama-3.3-70b-versatile")).toBeUndefined();
    expect(priceOf(undefined)).toBeUndefined();
  });
});

describe("estimateRequestCost", () => {
  const call = {
    promptName: "rewrite-bullet",
    system: "x".repeat(3500),
    input: "y".repeat(3500),
  };

  it("adds the answer's range to what is sent", () => {
    const estimate = estimateRequestCost("claude", "claude-sonnet-5-5", [call]);
    if (estimate.kind !== "priced") {
      throw new Error("expected a priced estimate");
    }
    expect(estimate.inputTokens).toBe(2000);
    expect(estimate.lowUsd).toBeCloseTo(
      estimate.inputUsd + estimate.outputLowUsd
    );
    expect(estimate.highUsd).toBeCloseTo(
      estimate.inputUsd + estimate.outputHighUsd
    );
    expect(estimate.highUsd).toBeGreaterThan(estimate.lowUsd);
    expect(estimate.hasFreeTier).toBe(false);
  });

  it("is free for a model on this computer", () => {
    expect(estimateRequestCost("ollama", "llama3", [call]).kind).toBe("free");
  });

  it("says unknown instead of guessing", () => {
    expect(estimateRequestCost("groq", "unlisted-model", [call]).kind).toBe(
      "unknown"
    );
  });

  it("marks a free tier", () => {
    const estimate = estimateRequestCost("gemini", "gemini-3.5-flash-lite", [
      call,
    ]);
    expect(estimate.kind === "priced" && estimate.hasFreeTier).toBe(true);
  });

  it("adds several requests together", () => {
    const one = estimateRequestCost("claude", "claude-haiku-5-5", [call]);
    const two = estimateRequestCost("claude", "claude-haiku-5-5", [call, call]);
    if (one.kind !== "priced" || two.kind !== "priced") {
      throw new Error("expected priced estimates");
    }
    expect(two.lowUsd).toBeCloseTo(one.lowUsd * 2);
  });
});

describe("actualCostUsd", () => {
  it("counts input and output tokens at their prices", () => {
    const cost = actualCostUsd("claude", "claude-sonnet-5-5", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBe(12);
  });

  it("is 0 for a local model and undefined without a price", () => {
    const usage = { inputTokens: 10, outputTokens: 10 };
    expect(actualCostUsd("ollama", "llama3", usage)).toBe(0);
    expect(actualCostUsd("groq", "unlisted-model", usage)).toBeUndefined();
  });
});

describe("wording", () => {
  it("writes small amounts as US cents", () => {
    expect(costHeadline(0.008, 0.033)).toEqual({
      main: "1 US cent",
      upTo: "3 US cents",
    });
  });

  it("gives one amount when low and high round to the same", () => {
    expect(costHeadline(0.011, 0.012)).toEqual({ main: "1 US cent" });
  });

  it("switches to dollars from one dollar", () => {
    expect(costHeadline(0.5, 1.2)).toEqual({
      main: "50 US cents",
      upTo: "$1.20",
    });
  });

  it("writes short amounts for a button", () => {
    expect(shortCost(0.001)).toBe("1¢");
    expect(shortCost(0.12)).toBe("12¢");
    expect(shortCost(1.5)).toBe("$1.50");
  });

  it("rounds words so they do not look exact", () => {
    expect(wordCount(1700)).toBe("1,300");
    expect(wordCount(10)).toBe("10");
  });
});
