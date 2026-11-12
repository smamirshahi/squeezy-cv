import { describe, expect, it } from "vitest";
import {
  CandidateInputError,
  createCandidate,
  isOverdue,
  updateCandidate,
} from "@shared/candidate/candidate-utils";

const made = createCandidate(
  { company: " Acme ", role: "Dev", note: "  ", applyBy: "2026-11-20" },
  "c1",
  "2026-11-12"
);

describe("createCandidate", () => {
  it("trims, drops empty fields and starts open", () => {
    expect(made).toEqual({
      id: "c1",
      version: 1,
      company: "Acme",
      role: "Dev",
      applyBy: "2026-11-20",
      status: "open",
      createdAt: "2026-11-12",
    });
  });

  it("keeps the job it was saved from", () => {
    expect(
      createCandidate({ company: "A", role: "", jobId: "j1" }, "c2", "d").jobId
    ).toBe("j1");
  });

  it("needs a company or a role", () => {
    expect(() =>
      createCandidate({ company: " ", role: "" }, "c", "2026-11-12")
    ).toThrow(CandidateInputError);
  });

  it("refuses a badly written day", () => {
    expect(() =>
      createCandidate({ company: "A", role: "B", applyBy: "20/11" }, "c", "d")
    ).toThrow(CandidateInputError);
  });
});

describe("updateCandidate", () => {
  it("changes the given fields only", () => {
    const next = updateCandidate(made, { status: "dropped", note: "call" });
    expect(next.status).toBe("dropped");
    expect(next.note).toBe("call");
    expect(next.company).toBe("Acme");
  });

  it("clears an optional field with an empty text", () => {
    expect(updateCandidate(made, { applyBy: "" }).applyBy).toBeUndefined();
  });

  it("will not leave both company and role empty", () => {
    expect(() => updateCandidate(made, { company: "", role: "" })).toThrow(
      CandidateInputError
    );
  });
});

describe("isOverdue", () => {
  it("is true only for an open candidate whose day has passed", () => {
    expect(isOverdue(made, "2026-11-21")).toBe(true);
    expect(isOverdue(made, "2026-11-20")).toBe(false);
    expect(isOverdue({ ...made, status: "dropped" }, "2026-12-01")).toBe(false);
    expect(isOverdue({ ...made, applyBy: undefined }, "2026-12-01")).toBe(
      false
    );
  });
});
