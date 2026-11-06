import { describe, expect, it } from "vitest";
import { exportChecks, suggestFileName } from "@shared/export/export-checks";

const input = {
  profile: { fullName: "Alex Morgan", email: "a@b.c", phone: "123" },
  pageCount: 1,
  pageLimit: 1,
  usedPercent: 92,
  linesOver: 0,
  hiddenItemCount: 0,
};

describe("exportChecks", () => {
  it("is all ok for a CV that fits and has contact details", () => {
    const checks = exportChecks(input);
    expect(checks.every((c) => c.level === "ok")).toBe(true);
    expect(checks.find((c) => c.id === "fit")?.detail).toContain("92%");
  });

  it("warns when it does not fit", () => {
    const fit = exportChecks({ ...input, pageCount: 2, linesOver: 4 }).find(
      (c) => c.id === "fit"
    );
    expect(fit?.level).toBe("warning");
    expect(fit?.detail).toContain("4 lines are over");
  });

  it("names what contact detail is missing", () => {
    const contact = exportChecks({
      ...input,
      profile: { fullName: "Alex", email: "" },
    }).find((c) => c.id === "contact");
    expect(contact?.level).toBe("warning");
    expect(contact?.detail).toBe("Missing: email, phone.");
  });

  it("mentions hidden items only when there are some", () => {
    expect(exportChecks(input).some((c) => c.id === "hidden")).toBe(false);
    expect(
      exportChecks({ ...input, hiddenItemCount: 1 }).find(
        (c) => c.id === "hidden"
      )?.title
    ).toBe("1 item hidden in this variant");
  });
});

describe("suggestFileName", () => {
  it("joins name, CV and variant with dashes", () => {
    expect(suggestFileName("Alex Morgan", "Senior React · FinTech")).toBe(
      "Alex-Morgan-CV-Senior-React-FinTech"
    );
  });

  it("falls back to CV", () => {
    expect(suggestFileName("", "")).toBe("CV");
  });
});
