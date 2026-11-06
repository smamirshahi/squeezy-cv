import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RawImportSchema } from "@custom-types/import-types";
import { importToVault } from "@shared/vault/import-from-text";

// A real (imperfect) llama3.1 answer to fixtures/messy-cv.txt, which contains an injected line
// (it added the junk profile key "Nobel Prize winner"). Re-record by running the import with Ollama.
const source = readFileSync("fixtures/messy-cv.txt", "utf8");
const raw = RawImportSchema.check(
  JSON.parse(readFileSync("fixtures/messy-cv-model-answer.json", "utf8"))
);

describe("import of a messy CV with a small model's answer", () => {
  let n = 0;
  const { vault, warnings } = importToVault(raw, source, () => `id${++n}`);

  it("keeps only the known profile keys", () => {
    expect(Object.keys(vault.profile).sort()).toEqual([
      "email",
      "fullName",
      "headline",
      "location",
      "phone",
      "rightToWork",
    ]);
    expect(vault.profile.headline).toBe("Senior Data Analyst");
  });

  it("reads the sections and dates", () => {
    expect(vault.sections.map((s) => s.type)).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
      "certifications",
    ]);
    const degree = vault.sections[2].items[0];
    expect(degree.fields.startDate).toBe("2013-01-01");
    expect(degree.fields.endDate).toBe("2016-01-01");
    expect(vault.sections[1].items[0].bullets).toHaveLength(3);
  });

  it("warns about the instruction hidden in the pasted text", () => {
    expect(warnings.some((w) => w.includes("looks like an instruction"))).toBe(
      true
    );
  });
});
