import { describe, expect, it } from "vitest";
import {
  pickItemsToHide,
  rankHideCandidates,
} from "@shared/layout/hide-candidates";
import { createVariant } from "@shared/variant/variant-utils";
import { createDefaultVault } from "@shared/vault/default-vault";
import { Vault } from "@custom-types/vault-types";
import { initialState } from "@store/cv-data/cv-data-slice";

function makeVault(): Vault {
  const vault = createDefaultVault();
  const item = (
    id: string,
    jobTitle: string
  ): Vault["sections"][number]["items"][number] => ({
    id,
    fields: { jobTitle },
    bullets: [],
    tags: [],
    shouldShow: true,
  });
  return {
    ...vault,
    sections: [
      {
        id: "exp",
        type: "experience",
        title: "Experience",
        items: [
          item("a", "Old job"),
          item("b", "Recent job"),
          item("c", "Mid job"),
        ],
      },
      {
        id: "sum",
        type: "summary",
        title: "Summary",
        items: [item("s", "Summary")],
      },
    ],
  };
}

describe("rankHideCandidates", () => {
  it("puts the least relevant first, later items first among equals, and skips the summary", () => {
    const vault = makeVault();
    const variant = createVariant(vault, initialState.style, "v", "V");
    variant.selection.b = { isVisible: true, relevance: 90 };
    variant.selection.c = { isVisible: true, relevance: 20 };
    const ids = rankHideCandidates(vault, variant).map((c) => c.itemId);
    expect(ids).toEqual(["c", "a", "b"]);
  });

  it("marks hidden items", () => {
    const vault = makeVault();
    const variant = createVariant(vault, initialState.style, "v", "V");
    variant.selection.a = { isVisible: false };
    const ranked = rankHideCandidates(vault, variant);
    expect(ranked.find((c) => c.itemId === "a")?.isHidden).toBe(true);
  });
});

describe("pickItemsToHide", () => {
  const candidates = ["x", "y", "z"].map((itemId) => ({
    itemId,
    sectionId: "s",
    sectionTitle: "S",
    label: itemId,
    relevance: 10,
    isHidden: itemId === "y",
  }));
  const lines: Record<string, number> = { x: 2, y: 5, z: 3 };

  it("takes items until enough lines are gained, ignoring hidden ones", () => {
    expect(pickItemsToHide(candidates, (id) => lines[id], 4)).toEqual([
      "x",
      "z",
    ]);
  });

  it("returns what it can when it is not enough", () => {
    expect(pickItemsToHide(candidates, (id) => lines[id], 99)).toEqual([
      "x",
      "z",
    ]);
  });

  it("returns nothing when nothing is needed", () => {
    expect(pickItemsToHide(candidates, (id) => lines[id], 0)).toEqual([]);
  });
});
