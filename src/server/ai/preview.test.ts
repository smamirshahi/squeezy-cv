import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { previewTailorRequest } from "@server/ai/preview";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const { vault } = migrateCvFile(sample);

describe("previewTailorRequest", () => {
  it("records both calls without sending anything, with personal details masked", async () => {
    const calls = await previewTailorRequest(vault, {
      jobAd: `Dear ${vault.profile.fullName}, we need a React developer.`,
      tone: "neutral",
    });
    expect(calls.map((c) => c.promptName)).toEqual([
      "extract-requirements",
      "propose-selection",
    ]);
    const everything = calls.map((c) => c.system + c.input).join("\n");
    expect(everything).toContain("[Candidate Name]");
    expect(everything).not.toContain(vault.profile.fullName);
    expect(everything).not.toContain(vault.profile.email ?? "no-email");
    // the CV text itself is what the model gets
    expect(calls[1].input).toContain("React");
  });

  it("also masks employer and school names when that option is on, and not otherwise", async () => {
    const input = {
      jobAd: "We need a React developer.",
      tone: "neutral",
    } as const;
    const off = await previewTailorRequest(vault, input);
    expect(off[1].input).toContain("Example Ltd");

    const on = await previewTailorRequest(vault, input, {
      isMaskingOrganisations: true,
    });
    const everything = on.map((c) => c.system + c.input).join("\n");
    for (const name of [
      "Example Ltd",
      "Sample Systems",
      "Demo Co",
      "University of Example",
    ]) {
      expect(everything).not.toContain(name);
    }
    expect(everything).toContain("[Company 1]");
    expect(everything).toContain("[School 1]");
  });
});
