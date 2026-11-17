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

  it("orders summary, skills, experience, projects, education", () => {
    const layout = developerLayout(
      sections(["education", "projects", "experience", "skills", "summary"])
    );
    expect(layout.fullWidth.slice(2)).toEqual([
      "summary-4",
      "skills-3",
      "experience-2",
      "projects-1",
      "education-0",
    ]);
  });

  it("leaves out publications, awards, certifications, interests and unsorted", () => {
    const layout = developerLayout(
      sections([
        "interests",
        "publications",
        "summary",
        "awards",
        "certifications",
        "unsorted",
        "skills",
      ])
    );
    expect(layout.fullWidth.slice(2)).toEqual(["summary-2", "skills-6"]);
  });

  it("keeps the vault's order between sections of the same type", () => {
    const layout = developerLayout([
      { id: "job-b", type: "experience" },
      { id: "job-a", type: "experience" },
    ]);
    expect(layout.fullWidth.slice(2)).toEqual(["job-b", "job-a"]);
  });

  it("places each kept section once and does not change its input", () => {
    const input = sections(["education", "custom", "summary", "education"]);
    const copy = structuredClone(input);
    const layout = developerLayout(input);
    expect(layout.fullWidth.slice(2).sort()).toEqual(
      ["education-0", "education-3", "summary-2"].sort()
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
