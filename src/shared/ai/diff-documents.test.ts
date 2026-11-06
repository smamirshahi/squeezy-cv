import { describe, expect, it } from "vitest";
import { createDefaultVault } from "@shared/vault/default-vault";
import {
  diffDocuments,
  diffWords,
  isDiffEmpty,
} from "@shared/ai/diff-documents";
import { RenderedDocument, RenderedItem } from "@shared/variant/render";

function item(
  id: string,
  texts: Record<string, string>,
  emphasis: "normal" | "high" = "normal"
): RenderedItem {
  return {
    id,
    fields: { jobTitle: `Job ${id}` },
    emphasis,
    bullets: Object.entries(texts).map(([bid, text]) => ({ id: bid, text })),
  };
}

function doc(...sections: [string, RenderedItem[]][]): RenderedDocument {
  const base = createDefaultVault();
  void base;
  return {
    tone: "neutral",
    pageLimit: 1,
    style: {} as RenderedDocument["style"],
    columns: {
      fullWidth: sections.map(([id, items]) => ({
        kind: "section" as const,
        id,
        type: "experience" as const,
        title: id.toUpperCase(),
        items,
      })),
      left: [],
      right: [],
    },
  };
}

describe("diffWords", () => {
  it("marks inserted and deleted words and reassembles both lines", () => {
    const parts = diffWords("Led the team of 8", "Led a team of 8 engineers");
    expect(
      parts
        .filter((p) => p.kind !== "ins")
        .map((p) => p.text)
        .join("")
    ).toBe("Led the team of 8 ");
    expect(
      parts
        .filter((p) => p.kind !== "del")
        .map((p) => p.text)
        .join("")
    ).toBe("Led a team of 8 engineers");
    expect(parts.some((p) => p.kind === "del" && p.text.trim() === "the")).toBe(
      true
    );
    expect(parts.some((p) => p.kind === "ins" && p.text.trim() === "a")).toBe(
      true
    );
  });

  it("is all 'same' for equal lines", () => {
    expect(diffWords("a b", "a b")).toEqual([{ kind: "same", text: "a b" }]);
  });
});

describe("diffDocuments", () => {
  const before = doc(
    [
      "s1",
      [
        item("i1", { b1: "Built the API", b2: "Ran standups" }),
        item("i2", { b3: "Old job" }),
      ],
    ],
    ["s2", [item("i3", { b4: "SQL" })]]
  );

  it("is empty for identical documents", () => {
    expect(isDiffEmpty(diffDocuments(before, before))).toBe(true);
  });

  it("reports removed items and bullets, changed wording, highlight and added bullets", () => {
    const after = doc(
      ["s1", [item("i1", { b1: "Built the REST API", b5: "New one" }, "high")]],
      ["s2", [item("i3", { b4: "SQL" })]]
    );
    const diff = diffDocuments(before, after);
    const [s1] = diff;
    const i1 = s1.items.find((i) => i.itemId === "i1")!;
    expect(i1.status).toBe("changed");
    expect(i1.emphasisChange).toBe("on");
    expect(i1.bullets.map((b) => [b.bulletId, b.status])).toEqual([
      ["b1", "changed"],
      ["b5", "added"],
      ["b2", "removed"],
    ]);
    expect(s1.items.find((i) => i.itemId === "i2")?.status).toBe("removed");
    expect(diff[1].items[0].status).toBe("same");
  });

  it("marks moved sections and moved items", () => {
    const after = doc(
      ["s2", [item("i3", { b4: "SQL" })]],
      [
        "s1",
        [
          item("i2", { b3: "Old job" }),
          item("i1", { b1: "Built the API", b2: "Ran standups" }),
        ],
      ]
    );
    const diff = diffDocuments(before, after);
    expect(diff.map((s) => [s.sectionId, s.isMoved])).toEqual([
      ["s2", true],
      ["s1", true],
    ]);
    expect(diff[1].items.every((i) => i.isMoved)).toBe(true);
    expect(isDiffEmpty(diff)).toBe(false);
  });
});
