import { describe, expect, it } from "vitest";
import { moveSectionTo } from "@pages/workspace/outline";

const structure = {
  fullWidth: ["personalInfo", "a", "b", "c"],
  left: ["d"],
  right: ["e", "f"],
};

describe("moveSectionTo", () => {
  it("takes the place of the section it is dropped on, down or up", () => {
    expect(moveSectionTo(structure, "a", "c")?.fullWidth).toEqual([
      "personalInfo",
      "b",
      "c",
      "a",
    ]);
    expect(moveSectionTo(structure, "c", "a")?.fullWidth).toEqual([
      "personalInfo",
      "c",
      "a",
      "b",
    ]);
  });

  it("moves between columns, keeping both complete", () => {
    const next = moveSectionTo(structure, "b", "e")!;
    expect(next.fullWidth).toEqual(["personalInfo", "a", "c"]);
    expect(next.right).toEqual(["b", "e", "f"]);
    expect(next.left).toEqual(["d"]);
  });

  it("does nothing for the same section or an unknown one", () => {
    expect(moveSectionTo(structure, "a", "a")).toBeNull();
    expect(moveSectionTo(structure, "a", "zzz")).toBeNull();
    expect(moveSectionTo(structure, "zzz", "a")).toBeNull();
  });
});
