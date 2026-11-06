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
});
