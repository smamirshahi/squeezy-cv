import { describe, expect, it } from "vitest";
import { ApplicationSummary } from "@custom-types/application-types";
import {
  computeVariantLocks,
  describeLock,
  isVariantLocked,
} from "@shared/variant/variant-lock";

function app(
  id: string,
  variantId: string,
  status: ApplicationSummary["status"] = "applied",
  company = "Acme"
): ApplicationSummary {
  return {
    id,
    company,
    role: "Dev",
    status,
    appliedAt: "2026-05-01",
    variantId,
    updatedAt: "2026-05-01",
    isCorrupt: false,
  };
}

const damaged: ApplicationSummary = {
  ...app("x", ""),
  company: "",
  isCorrupt: true,
};

describe("isVariantLocked", () => {
  it("is not locked without applications", () => {
    expect(isVariantLocked("v1", [])).toBe(false);
  });

  it("is locked while Applied, only for that variant", () => {
    expect(isVariantLocked("v1", [app("a", "v1")])).toBe(true);
    expect(isVariantLocked("v2", [app("a", "v1")])).toBe(false);
  });

  it("is not locked by later statuses", () => {
    for (const status of ["interview", "offer", "rejected"] as const) {
      expect(isVariantLocked("v1", [app("a", "v1", status)])).toBe(false);
    }
  });

  it("is locked while any of several applications is Applied", () => {
    const list = [app("a", "v1", "rejected"), app("b", "v1")];
    expect(isVariantLocked("v1", list)).toBe(true);
  });

  it("treats a damaged application as locking everything", () => {
    expect(isVariantLocked("v1", [damaged])).toBe(true);
    expect(computeVariantLocks([damaged]).hasUnreadable).toBe(true);
  });
});

describe("describeLock", () => {
  it("names the company and day", () => {
    expect(describeLock(computeVariantLocks([app("a", "v1")]), "v1")).toBe(
      "Sent to Acme on 2026-05-01. Locked."
    );
  });

  it("names several, and explains a damaged file", () => {
    const two = computeVariantLocks([
      app("a", "v1"),
      app("b", "v1", "applied", "Beta"),
    ]);
    expect(describeLock(two, "v1")).toContain("Acme (2026-05-01) and Beta");
    expect(describeLock(computeVariantLocks([damaged]), "v1")).toContain(
      "damaged"
    );
    expect(describeLock(computeVariantLocks([]), "v1")).toBe("");
  });
});
