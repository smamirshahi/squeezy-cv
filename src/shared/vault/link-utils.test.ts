import { describe, expect, it } from "vitest";
import { normaliseLink } from "@shared/vault/link-utils";

describe("normaliseLink", () => {
  it("adds https when there is no scheme and keeps http(s) as written", () => {
    expect(normaliseLink("example.com")).toBe("https://example.com/");
    expect(normaliseLink("  https://example.com/a  ")).toBe(
      "https://example.com/a"
    );
    expect(normaliseLink("http://example.com")).toBe("http://example.com/");
  });

  it("gives no link for empty, invalid or non-http schemes", () => {
    expect(normaliseLink(undefined)).toBeUndefined();
    expect(normaliseLink("   ")).toBeUndefined();
    expect(normaliseLink("javascript:alert(1)")).toBeUndefined();
    expect(normaliseLink("mailto:a@b.com")).toBeUndefined();
    expect(normaliseLink("http://")).toBeUndefined();
  });
});
