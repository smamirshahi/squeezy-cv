import { describe, expect, it } from "vitest";
import { createDefaultVault } from "@shared/vault/default-vault";
import { moveTargets } from "@shared/vault/unsorted";
import {
  addItem,
  ensureUnsortedSection,
  moveItemToSection,
  removeSection,
  vaultReducer,
} from "@store/vault/vault-slice";

describe("Unsorted section", () => {
  it("is created on demand, once, and last", () => {
    const vault = createDefaultVault();
    expect(vault.sections.some((s) => s.type === "unsorted")).toBe(false);
    const once = vaultReducer(vault, ensureUnsortedSection());
    const twice = vaultReducer(once, ensureUnsortedSection());
    expect(twice.sections.filter((s) => s.type === "unsorted")).toHaveLength(1);
    expect(twice.sections.at(-1)?.type).toBe("unsorted");
  });

  it("cannot be deleted", () => {
    const vault = vaultReducer(createDefaultVault(), ensureUnsortedSection());
    const after = vaultReducer(vault, removeSection({ id: "unsorted" }));
    expect(after.sections.some((s) => s.type === "unsorted")).toBe(true);
  });

  it("moves an item to another section without losing its data", () => {
    let vault = vaultReducer(createDefaultVault(), ensureUnsortedSection());
    vault = vaultReducer(
      vault,
      addItem({ sectionId: "unsorted", id: "x", fields: { title: "AWS" } })
    );
    const before = vault.sections.find((s) => s.id === "unsorted")!.items[0];
    vault = vaultReducer(
      vault,
      moveItemToSection({
        sectionId: "unsorted",
        itemId: "x",
        toSectionId: "experience",
      })
    );
    expect(vault.sections.find((s) => s.id === "unsorted")!.items).toEqual([]);
    expect(vault.sections.find((s) => s.id === "experience")!.items).toEqual([
      before,
    ]);
  });

  it("ignores a move to a missing section or the same section", () => {
    let vault = vaultReducer(createDefaultVault(), ensureUnsortedSection());
    vault = vaultReducer(vault, addItem({ sectionId: "unsorted", id: "x" }));
    const same = vaultReducer(
      vault,
      moveItemToSection({
        sectionId: "unsorted",
        itemId: "x",
        toSectionId: "nope",
      })
    );
    expect(same).toEqual(vault);
  });

  it("offers every section except the current one, Unsorted and the summary as targets", () => {
    const vault = vaultReducer(createDefaultVault(), ensureUnsortedSection());
    const ids = moveTargets(vault, "unsorted").map((s) => s.id);
    expect(ids).toContain("experience");
    expect(ids).not.toContain("unsorted");
    expect(ids).not.toContain("summary");
  });
});
