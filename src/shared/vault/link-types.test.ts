import { describe, expect, it } from "vitest";
import {
  guessLinkTypeFromUrl,
  LINK_TYPES,
  linkTypeById,
  linkTypeOfLabel,
  OTHER_LINK_TYPE_ID,
} from "@shared/vault/link-types";

describe("link types", () => {
  it("has unique ids and ends with Other", () => {
    const ids = LINK_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe(OTHER_LINK_TYPE_ID);
  });

  it("includes the common platforms", () => {
    const labels = LINK_TYPES.map((type) => type.label);
    for (const label of ["GitHub", "X", "LinkedIn", "Instagram", "Other"]) {
      expect(labels).toContain(label);
    }
  });

  it("matches a saved label ignoring case and aliases", () => {
    expect(linkTypeOfLabel("linkedin").id).toBe("linkedin");
    expect(linkTypeOfLabel(" GitHub ").id).toBe("github");
    expect(linkTypeOfLabel("Twitter").id).toBe("x");
    expect(linkTypeOfLabel("Portfolio").id).toBe("website");
  });

  it("treats unknown or empty labels as Other", () => {
    expect(linkTypeOfLabel("My cat blog 2").id).toBe(OTHER_LINK_TYPE_ID);
    expect(linkTypeOfLabel("").id).toBe(OTHER_LINK_TYPE_ID);
    expect(linkTypeOfLabel("Other").id).toBe(OTHER_LINK_TYPE_ID);
  });

  it("looks a type up by id, unknown ids are Other", () => {
    expect(linkTypeById("gitlab").label).toBe("GitLab");
    expect(linkTypeById("nope").id).toBe(OTHER_LINK_TYPE_ID);
  });

  it("guesses the type from a URL", () => {
    expect(guessLinkTypeFromUrl("https://www.github.com/me").id).toBe("github");
    expect(guessLinkTypeFromUrl("https://twitter.com/me").id).toBe("x");
    expect(guessLinkTypeFromUrl("https://uk.linkedin.com/in/me").id).toBe(
      "linkedin"
    );
    expect(guessLinkTypeFromUrl("https://example.com").id).toBe(
      OTHER_LINK_TYPE_ID
    );
    expect(guessLinkTypeFromUrl("not a url").id).toBe(OTHER_LINK_TYPE_ID);
  });
});
