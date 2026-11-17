import { describe, expect, it } from "vitest";
import { SectionType } from "@custom-types/vault-types";
import { developerLayout } from "@shared/vault/page-structure";
import { PREMADE_TEMPLATES } from "@shared/vault/premade-templates";

function sections(types: SectionType[]): { id: string; type: SectionType }[] {
  return types.map((type, index) => ({ id: `${type}-${index}`, type }));
}

describe("developerLayout", () => {
  it("is one column: header first, nothing left or right", () => {
    const layout = developerLayout(sections(["summary", "experience"]));
    expect(layout.fullWidth.slice(0, 2)).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
    expect(layout.left).toEqual([]);
    expect(layout.right).toEqual([]);
  });

  it("orders summary, skills, experience, projects, education, certifications", () => {
    const layout = developerLayout(
      sections([
        "certifications",
        "education",
        "projects",
        "experience",
        "skills",
        "summary",
      ])
    );
    expect(layout.fullWidth.slice(2)).toEqual([
      "summary-5",
      "skills-4",
      "experience-3",
      "projects-2",
      "education-1",
      "certifications-0",
    ]);
  });

  it("puts the other sections last, in the vault's order", () => {
    const layout = developerLayout(
      sections(["interests", "publications", "summary", "awards", "skills"])
    );
    expect(layout.fullWidth.slice(2)).toEqual([
      "summary-2",
      "skills-4",
      "interests-0",
      "publications-1",
      "awards-3",
    ]);
  });

  it("keeps the vault's order between sections of the same type", () => {
    const layout = developerLayout([
      { id: "job-b", type: "experience" },
      { id: "job-a", type: "experience" },
    ]);
    expect(layout.fullWidth.slice(2)).toEqual(["job-b", "job-a"]);
  });

  it("places every section exactly once and does not change its input", () => {
    const input = sections(["education", "custom", "summary", "custom"]);
    const copy = structuredClone(input);
    const layout = developerLayout(input);
    expect(layout.fullWidth.slice(2).sort()).toEqual(
      input.map((s) => s.id).sort()
    );
    expect(input).toEqual(copy);
  });

  it("with no sections gives only the header", () => {
    expect(developerLayout([]).fullWidth).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
  });
});

describe("PREMADE_TEMPLATES", () => {
  it("lists Developer first, with a name, a description and a layout builder", () => {
    const [developer] = PREMADE_TEMPLATES;
    expect(developer.name).toBe("Developer");
    expect(developer.description).not.toBe("");
    expect(developer.buildLayout(sections(["summary"])).fullWidth).toContain(
      "summary-0"
    );
  });

  it("has unique keys and names", () => {
    expect(new Set(PREMADE_TEMPLATES.map((p) => p.key)).size).toBe(
      PREMADE_TEMPLATES.length
    );
    expect(new Set(PREMADE_TEMPLATES.map((p) => p.name)).size).toBe(
      PREMADE_TEMPLATES.length
    );
  });
});
