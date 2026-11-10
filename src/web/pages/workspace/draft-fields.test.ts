import { describe, expect, it } from "vitest";
import { Item } from "@custom-types/vault-types";
import { withDraft } from "@pages/workspace/draft-fields";

function item(id: string, fields: Record<string, string>): Item {
  return { id, fields, bullets: [], tags: [], shouldShow: true };
}

describe("withDraft", () => {
  const base = item("a", { title: "Saved", year: "2020" });

  it("shows the unapplied edits of that item only", () => {
    const draft = { itemId: "a", fields: { title: "Typing…" } };
    expect(withDraft(base, draft).fields).toEqual({
      title: "Typing…",
      year: "2020",
    });
    expect(withDraft(item("b", { title: "Other" }), draft).fields.title).toBe(
      "Other"
    );
  });

  it("returns the item itself without a draft", () => {
    expect(withDraft(base, null)).toBe(base);
  });
});
