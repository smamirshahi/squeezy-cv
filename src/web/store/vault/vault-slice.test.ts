import { describe, expect, it } from "vitest";
import {
  addSection,
  initialState,
  moveSection,
  removeSection,
  renameSection,
  resetVaultState,
  setVault,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import { reconcileStructure } from "@shared/vault/page-structure";

function withSections(...ids: string[]): VaultState {
  return {
    ...initialState,
    sections: ids.map((id) => ({
      id,
      type: "custom",
      title: id.toUpperCase(),
      items: [],
    })),
  };
}

function ids(state: VaultState): string[] {
  return state.sections.map((s) => s.id);
}

describe("vault sections", () => {
  it("adds a section with an empty item list at the end", () => {
    const state = vaultReducer(
      withSections("a"),
      addSection({ id: "b", type: "projects", title: "Projects" })
    );
    expect(state.sections[1]).toEqual({
      id: "b",
      type: "projects",
      title: "Projects",
      items: [],
    });
  });

  it("generates a unique id when none is given", () => {
    let state = vaultReducer(
      initialState,
      addSection({ type: "custom", title: "One" })
    );
    state = vaultReducer(state, addSection({ type: "custom", title: "Two" }));
    const [first, second] = ids(state);
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it("removes a section and its items", () => {
    const state = vaultReducer(
      withSections("a", "b", "c"),
      removeSection({ id: "b" })
    );
    expect(ids(state)).toEqual(["a", "c"]);
  });

  it("ignores removing or renaming an unknown id", () => {
    const before = withSections("a");
    expect(vaultReducer(before, removeSection({ id: "x" }))).toEqual(before);
    expect(
      vaultReducer(before, renameSection({ id: "x", title: "Y" }))
    ).toEqual(before);
  });

  it("renames a section without touching others", () => {
    const state = vaultReducer(
      withSections("a", "b"),
      renameSection({ id: "b", title: "Work history" })
    );
    expect(state.sections.map((s) => s.title)).toEqual(["A", "Work history"]);
  });

  it.each([
    ["to the front", "c", 0, ["c", "a", "b"]],
    ["to the middle", "a", 1, ["b", "a", "c"]],
    ["to the end", "a", 2, ["b", "c", "a"]],
    ["clamps a too-large index", "a", 99, ["b", "c", "a"]],
    ["clamps a negative index", "c", -5, ["c", "a", "b"]],
    ["keeps order when not moving", "b", 1, ["a", "b", "c"]],
  ])("moves a section %s", (_name, id, toIndex, expected) => {
    const state = vaultReducer(
      withSections("a", "b", "c"),
      moveSection({ id, toIndex })
    );
    expect(ids(state)).toEqual(expected);
  });

  it("ignores moving an unknown id", () => {
    const before = withSections("a", "b");
    expect(vaultReducer(before, moveSection({ id: "x", toIndex: 0 }))).toEqual(
      before
    );
  });

  it("replaces and resets the whole vault", () => {
    const vault = withSections("a");
    expect(vaultReducer(initialState, setVault(vault))).toEqual(vault);
    expect(vaultReducer(vault, resetVaultState())).toEqual(initialState);
  });

  it("does not mutate the previous state", () => {
    const before = withSections("a", "b");
    const snapshot = JSON.stringify(before);
    vaultReducer(before, removeSection({ id: "a" }));
    vaultReducer(before, moveSection({ id: "a", toIndex: 1 }));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("reconcileStructure", () => {
  const base = {
    fullWidth: ["header", "summary"],
    left: ["exp"],
    right: ["edu"],
  };

  it("keeps a consistent structure unchanged", () => {
    const valid = ["header", "summary", "exp", "edu"];
    expect(reconcileStructure(base, valid)).toEqual(base);
  });

  it("drops a deleted section from whichever column it was in", () => {
    const result = reconcileStructure(base, ["header", "summary", "edu"]);
    expect(result).toEqual({
      fullWidth: ["header", "summary"],
      left: [],
      right: ["edu"],
    });
  });

  it("leaves a new section out unless asked to add missing ones", () => {
    const valid = ["header", "summary", "exp", "edu", "proj", "cert"];
    expect(reconcileStructure(base, valid)).toEqual(base);
  });

  it("places a new section in the default column, in order, when asked", () => {
    const valid = ["header", "summary", "exp", "edu", "proj", "cert"];
    expect(reconcileStructure(base, valid, "left", true).left).toEqual([
      "exp",
      "proj",
      "cert",
    ]);
    expect(reconcileStructure(base, valid, "right", true).right).toEqual([
      "edu",
      "proj",
      "cert",
    ]);
  });

  it("removes duplicates, keeping the first placement", () => {
    const result = reconcileStructure(
      { fullWidth: ["a"], left: ["a", "b"], right: ["b"] },
      ["a", "b"]
    );
    expect(result).toEqual({ fullWidth: ["a"], left: ["b"], right: [] });
  });

  it("builds a full structure from an empty one", () => {
    const empty = { fullWidth: [], left: [], right: [] };
    expect(
      reconcileStructure(empty, ["x", "y"], "fullWidth", true).fullWidth
    ).toEqual(["x", "y"]);
  });

  it("does not mutate its input", () => {
    const input = { fullWidth: ["a"], left: ["b"], right: [] };
    const snapshot = JSON.stringify(input);
    reconcileStructure(input, ["a"]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
