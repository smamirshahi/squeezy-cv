import { describe, expect, it } from "vitest";
import { MODEL_PRICES } from "@shared/ai/pricing";
import {
  isConfirmed,
  plainText,
  sourceOf,
  unconfirmedModels,
} from "@shared/ai/price-check";

const NOW = new Date("2026-11-21");

describe("plainText", () => {
  it("drops scripts, styles and tags", () => {
    expect(
      plainText(
        "<style>p{}</style><p>Sonnet&nbsp;<b>$2</b></p><script>var x = '$9'</script>"
      ).trim()
    ).toBe("Sonnet $2");
  });
});

describe("isConfirmed", () => {
  it("confirms a model whose two prices follow its name", () => {
    const page = "Claude Sonnet 5.5 Input $2.00 / MTok Output $10.00 / MTok";
    expect(isConfirmed(page, "claude-sonnet-5-5", NOW)).toBe(true);
  });

  it("reads prices written with or without cents, and the model's id as well as its name", () => {
    expect(
      isConfirmed("claude-haiku-5-5: $0.1 in, $0.50 out", "claude-haiku-5-5")
    ).toBe(true);
    expect(isConfirmed("$0.075 and $0.3", "openai/gpt-oss-20b")).toBe(false);
    expect(
      isConfirmed("openai/gpt-oss-20b $0.075 / $0.30", "openai/gpt-oss-20b")
    ).toBe(true);
  });

  it("does not confirm when the price changed", () => {
    const page = "Claude Sonnet 5.5 Input $3.00 / MTok Output $15.00 / MTok";
    expect(isConfirmed(page, "claude-sonnet-5-5", NOW)).toBe(false);
  });

  it("does not confirm when only one of the two prices is there", () => {
    expect(
      isConfirmed(
        "Claude Sonnet 5.5 Input $2.00 Output $12.00",
        "claude-sonnet-5-5"
      )
    ).toBe(false);
  });

  it("does not confirm a price that is far from the name, or a longer number", () => {
    const far = `Claude Sonnet 5.5 ${"x ".repeat(500)} $2.00 $10.00`;
    expect(isConfirmed(far, "claude-sonnet-5-5")).toBe(false);
    expect(
      isConfirmed("Claude Sonnet 5.5 $2.50 $10.50", "claude-sonnet-5-5")
    ).toBe(false);
  });

  it("does not confirm a model the page does not name, or one without a price", () => {
    expect(
      isConfirmed("Claude Haiku 5.5 $0.10 $0.50", "claude-sonnet-5-5")
    ).toBe(false);
    expect(isConfirmed("llama $1 $2", "unlisted-model")).toBe(false);
  });

  it("uses the price that applies on the day (an announced change)", () => {
    const page = "gemini-3.8-flash Input $1.50 Output $7.50";
    expect(isConfirmed(page, "gemini-3.8-flash", new Date("2026-12-31"))).toBe(
      false
    );
    expect(isConfirmed(page, "gemini-3.8-flash", new Date("2027-01-01"))).toBe(
      true
    );
  });
});

describe("unconfirmedModels", () => {
  it("lists every model of a page that is missing or does not confirm", () => {
    const missing = unconfirmedModels({}, NOW);
    expect(missing).toEqual(Object.keys(MODEL_PRICES));
    const onlyClaude = unconfirmedModels({ anthropic: "nothing here" }, NOW);
    expect(
      onlyClaude.filter((model) => sourceOf(model) === "anthropic")
    ).toEqual(
      Object.keys(MODEL_PRICES).filter(
        (model) => sourceOf(model) === "anthropic"
      )
    );
  });

  it("is empty when every page confirms its models", () => {
    const text = Object.entries(MODEL_PRICES)
      .map(([model, price]) => `${model} $${price.input} $${price.output}`)
      .join(" ... ");
    expect(
      unconfirmedModels({ anthropic: text, google: text, groq: text }, NOW)
    ).toEqual([]);
  });
});
