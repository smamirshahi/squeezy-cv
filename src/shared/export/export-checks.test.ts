import { describe, expect, it } from "vitest";
import { TailorRecord } from "@custom-types/variant-types";
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
    ).toBe("1 item hidden in this job");
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

describe("exportChecks against the job it was tailored for", () => {
  const tailor: TailorRecord = {
    at: "2026-11-06",
    jobTitle: "Senior React Developer",
    requirements: {
      jobTitle: "Senior React Developer",
      seniority: "senior",
      mustHave: ["React", "GraphQL"],
      niceToHave: ["Docker"],
      keywords: [],
    },
    gaps: ["GraphQL"],
    acceptedFlagged: [
      {
        bulletId: "b1",
        wording: "formal",
        text: "Used Kubernetes for state",
        flags: ['name "Kubernetes" is not in your CV'],
      },
    ],
  };
  const find = (
    id: string,
    over: Partial<typeof input & { cvText: string }> = {}
  ) =>
    exportChecks({ ...input, tailor, cvText: "React developer", ...over }).find(
      (c) => c.id === id
    )!;

  it("has no tailor checks for a variant that was not tailored", () => {
    const ids = exportChecks({ ...input, cvText: "x" }).map((c) => c.id);
    expect(ids).not.toContain("requirements");
    expect(ids).not.toContain("flagged");
  });

  it("warns about a must-have the CV does not show, and not about nice-to-haves", () => {
    const check = find("requirements");
    expect(check.level).toBe("warning");
    expect(check.title).toBe("1 must-have requirement is not shown");
    expect(check.detail).toContain("GraphQL");
    expect(check.detail).not.toContain("Docker");
  });

  it("is ok when every must-have is in the CV", () => {
    expect(
      find("requirements", { cvText: "React and GraphQL APIs" }).level
    ).toBe("ok");
  });

  it("warns about an accepted flagged rewording only while it is still in the CV", () => {
    const inCv = find("flagged", {
      cvText: "Used Kubernetes for state\nReact",
    });
    expect(inCv.level).toBe("warning");
    expect(inCv.detail).toContain("Kubernetes");
    expect(find("flagged").level).toBe("ok");
  });
});
