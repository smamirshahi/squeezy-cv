import { describe, expect, it } from "vitest";
import { PageStructure } from "@store/app/app-slice-types";
import {
  findItemSideById,
  findTargetSide,
  moveBetweenColumns,
  reorderInColumn,
} from "@pages/editor-page/section-placement/section-placement-utils";

const structure: PageStructure = {
  fullWidth: ["personalInfo", "contactInfo"],
  left: ["experience", "projects"],
  right: ["education"],
};

describe("findItemSideById / findTargetSide", () => {
  it("finds the column of a part", () => {
    expect(findItemSideById(structure, "projects")).toBe("left");
    expect(findItemSideById(structure, "nope")).toBeNull();
  });

  it("treats a column name as the column itself", () => {
    expect(findTargetSide(structure, "right")).toBe("right");
    expect(findTargetSide(structure, "experience")).toBe("left");
    expect(findTargetSide(structure, "nope")).toBeNull();
  });
});

describe("moveBetweenColumns", () => {
  it("moves a part before the part it is over in another column", () => {
    const next = moveBetweenColumns(structure, "experience", "education");
    expect(next.left).toEqual(["projects"]);
    expect(next.right).toEqual(["experience", "education"]);
    expect(next.fullWidth).toEqual(structure.fullWidth);
  });

  it("puts a part at the end when dropped on the column itself, even an empty one", () => {
    const empty: PageStructure = { ...structure, right: [] };
    expect(moveBetweenColumns(empty, "projects", "right").right).toEqual([
      "projects",
    ]);
    expect(moveBetweenColumns(structure, "projects", "right").right).toEqual([
      "education",
      "projects",
    ]);
  });

  it("does not change anything inside one column or for unknown ids", () => {
    expect(moveBetweenColumns(structure, "experience", "projects")).toBe(
      structure
    );
    expect(moveBetweenColumns(structure, "nope", "right")).toBe(structure);
    expect(moveBetweenColumns(structure, "experience", "nope")).toBe(structure);
  });

  it("does not change its input and keeps every part exactly once", () => {
    const copy = structuredClone(structure);
    const next = moveBetweenColumns(structure, "personalInfo", "education");
    expect(structure).toEqual(copy);
    expect([...next.fullWidth, ...next.left, ...next.right].sort()).toEqual(
      [...copy.fullWidth, ...copy.left, ...copy.right].sort()
    );
  });
});

describe("reorderInColumn", () => {
  it("puts a part where the part it is over is", () => {
    expect(reorderInColumn(structure, "projects", "experience").left).toEqual([
      "projects",
      "experience",
    ]);
    expect(
      reorderInColumn(structure, "personalInfo", "contactInfo").fullWidth
    ).toEqual(["contactInfo", "personalInfo"]);
  });

  it("does nothing when dropped on itself, in another column or on a column", () => {
    expect(reorderInColumn(structure, "projects", "projects")).toBe(structure);
    expect(reorderInColumn(structure, "projects", "education")).toBe(structure);
    expect(reorderInColumn(structure, "projects", "left")).toBe(structure);
  });
});
