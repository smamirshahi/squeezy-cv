import { describe, expect, it } from "vitest";
import { RawImport } from "@custom-types/import-types";
import {
  importToVault,
  mergeIntoVault,
  toIsoDate,
} from "@shared/vault/import-from-text";
import { createDefaultVault } from "@shared/vault/default-vault";

const SOURCE = `Alex Morgan
alex@example.com  07700 900123
Senior Developer at Acme, Mar 2021 - Present
Led the rebuild of the onboarding flow
Skills: React, TypeScript`;

function raw(): RawImport {
  return {
    profile: {
      fullName: "Alex Morgan",
      email: "alex@example.com",
      phone: "07700 900123",
    },
    links: [{ label: "Site", url: "https://alex.example" }],
    sections: [
      {
        type: "experience",
        title: "Work Experience",
        items: [
          {
            fields: {
              jobTitle: "Senior Developer",
              company: "Acme",
              startDate: "2021-03",
              endDate: "Present",
            },
            bullets: ["Led the rebuild of the onboarding flow"],
          },
        ],
      },
    ],
  };
}

let counter = 0;
const newId = (): string => {
  counter += 1;
  return `id${counter}`;
};

describe("toIsoDate", () => {
  it.each([
    ["2021", "2021-01-01"],
    ["2021-03", "2021-03-01"],
    ["2021-03-15", "2021-03-15"],
  ])("%s", (input, expected) => {
    expect(toIsoDate(input)).toBe(expected);
  });

  it("rejects other text", () => {
    expect(toIsoDate("Mar 2021")).toBeNull();
  });
});

describe("importToVault", () => {
  it("builds a vault with ids, ISO dates and no warnings for text that is in the source", () => {
    const { vault, warnings } = importToVault(raw(), SOURCE, newId);
    expect(warnings).toEqual([]);
    const job = vault.sections[0].items[0];
    expect(job.fields.startDate).toBe("2021-03-01");
    // "Present" is not a date: left out without a warning
    expect(job.fields.endDate).toBeUndefined();
    // points of a job become lines of its description; no bullets are kept (#244)
    expect(job.fields.description).toBe(
      "Led the rebuild of the onboarding flow"
    );
    expect(job.bullets).toEqual([]);
    expect(new Set([job.id, vault.sections[0].id]).size).toBe(2);
  });

  it("reports a bullet the model made up", () => {
    const made = raw();
    made.sections[0].items[0].bullets?.push("Saved the company £2m");
    const { warnings } = importToVault(made, SOURCE, newId);
    expect(warnings).toEqual([
      "A Work Experience point is not in the text you pasted: “Saved the company £2m”.",
    ]);
  });

  it("reports an email that is not in the source and a date it cannot read", () => {
    const made = raw();
    made.profile.email = "other@example.com";
    made.sections[0].items[0].fields.startDate = "March";
    const { warnings } = importToVault(made, SOURCE, newId);
    expect(warnings).toHaveLength(2);
  });
});

describe("mergeIntoVault", () => {
  it("fills only empty profile fields, adds items to the same type and links without repeats", () => {
    const existing = createDefaultVault();
    existing.profile = { fullName: "Alex Morgan", email: "mine@example.com" };
    existing.links = [
      { id: "l", label: "Site", url: "https://alex.example", tags: [] },
    ];
    const { vault: imported } = importToVault(raw(), SOURCE, newId);
    const merged = mergeIntoVault(existing, imported);
    expect(merged.profile.email).toBe("mine@example.com");
    expect(merged.profile.phone).toBe("07700 900123");
    expect(merged.links).toHaveLength(1);
    const experience = merged.sections.find((s) => s.type === "experience");
    expect(experience?.items).toHaveLength(1);
    expect(merged.sections).toHaveLength(existing.sections.length);
  });

  it("adds a section for a type that is missing", () => {
    const existing = createDefaultVault();
    existing.sections = existing.sections.filter(
      (s) => s.type !== "experience"
    );
    const { vault: imported } = importToVault(raw(), SOURCE, newId);
    expect(
      mergeIntoVault(existing, imported).sections.some(
        (s) => s.type === "experience"
      )
    ).toBe(true);
  });
});

describe("import robustness", () => {
  it("accepts items without bullets, drops empty fields and splits a year range", () => {
    const made = raw();
    const item = made.sections[0].items[0];
    delete item.bullets;
    item.fields = { jobTitle: "Lead", location: "", startDate: "2013-2016" };
    const { vault } = importToVault(made, SOURCE, newId);
    const out = vault.sections[0].items[0];
    expect(out.bullets).toEqual([]);
    expect(out.fields).toEqual({
      jobTitle: "Lead",
      startDate: "2013-01-01",
      endDate: "2016-01-01",
    });
  });
});
