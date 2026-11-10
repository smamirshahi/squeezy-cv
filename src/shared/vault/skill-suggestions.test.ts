import { describe, expect, it } from "vitest";
import {
  isLanguageGroup,
  languageLevelLabel,
  skillSuggestions,
  SKILL_CATEGORIES,
} from "@shared/vault/skill-suggestions";
import { levelLabel } from "@shared/vault/vault-utils";

describe("isLanguageGroup", () => {
  it.each([
    ["Languages", true],
    ["Spoken languages", true],
    ["language", true],
    ["Programming languages", false],
    ["Coding Languages", false],
    ["Frameworks", false],
    [undefined, false],
  ])("%s -> %s", (category, expected) => {
    expect(isLanguageGroup(category)).toBe(expected);
  });
});

describe("skillSuggestions", () => {
  it("offers spoken languages for a language group", () => {
    const options = skillSuggestions("Languages");
    expect(options).toContain("English");
    expect(options).not.toContain("TypeScript");
  });

  it("offers AI tools for an AI group", () => {
    const options = skillSuggestions("AI-assisted development");
    expect(options).toContain("Claude Code");
    expect(options).not.toContain("English");
  });

  it("offers technical and general skills otherwise", () => {
    const options = skillSuggestions("Tools");
    expect(options).toContain("TypeScript");
    expect(options).toContain("Excel");
  });

  it("has no repeated skills in a list", () => {
    for (const category of ["Languages", "AI", "Tools", undefined]) {
      const options = skillSuggestions(category);
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it("lists the default categories, including AI-assisted development", () => {
    expect(SKILL_CATEGORIES).toContain("AI-assisted development");
    expect(SKILL_CATEGORIES).toContain("Languages");
    expect(new Set(SKILL_CATEGORIES).size).toBe(SKILL_CATEGORIES.length);
  });
});

describe("level names", () => {
  it("uses language levels, 5 = Native", () => {
    expect([1, 2, 3, 4, 5].map(languageLevelLabel)).toEqual([
      "Basic",
      "Conversational",
      "Professional",
      "Fluent",
      "Native",
    ]);
    expect(languageLevelLabel(undefined)).toBe("No level");
    expect(languageLevelLabel(4.5)).toBe("Fluent");
  });

  it("levelLabel switches to the language names only for a language group", () => {
    expect(levelLabel(5, "Languages")).toBe("Native");
    expect(levelLabel(5, "Tools")).toBe("Expert");
    expect(levelLabel(5)).toBe("Expert");
    expect(levelLabel(0, "Languages")).toBe("No level");
  });
});
