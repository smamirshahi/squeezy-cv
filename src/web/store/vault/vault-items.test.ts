import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { Item } from "@custom-types/vault-types";
import { migrateLegacyFile } from "@shared/vault/migrate-vault";
import {
  addBullet,
  addItem,
  moveBullet,
  moveItem,
  removeBullet,
  removeItem,
  setBulletAlt,
  setItemNotes,
  setItemOpinion,
  setItemTags,
  setItemVisibility,
  updateBullet,
  updateItemFields,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import { moveInArray, normalizeTags } from "@shared/vault/vault-utils";

function freshVault(): VaultState {
  let n = 0;
  return migrateLegacyFile(sample, () => `gen-${++n}`).vault;
}

const EXP = "experience";
const ref = { sectionId: EXP, itemId: "exp-1" };
const bulletRef = { ...ref, bulletId: "gen-4" };

function exp(state: VaultState, itemId = "exp-1"): Item {
  return state.sections
    .find((s) => s.id === EXP)!
    .items.find((i) => i.id === itemId)!;
}

describe("vault-utils", () => {
  it("moveInArray moves, clamps and ignores bad indexes", () => {
    expect(moveInArray([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveInArray([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    expect(moveInArray([1, 2, 3], 0, 99)).toEqual([2, 3, 1]);
    expect(moveInArray([1, 2, 3], 1, -4)).toEqual([2, 1, 3]);
    expect(moveInArray([1, 2, 3], -1, 0)).toEqual([1, 2, 3]);
    expect(moveInArray([1, 2, 3], 3, 0)).toEqual([1, 2, 3]);
  });

  it("normalizeTags trims, drops empties and case-insensitive duplicates", () => {
    expect(
      normalizeTags([" React ", "react", "", "  ", "CI-CD", "ci-cd", "Testing"])
    ).toEqual(["React", "CI-CD", "Testing"]);
  });
});

describe("items", () => {
  it("adds an item with defaults to the right section", () => {
    const state = vaultReducer(
      freshVault(),
      addItem({ sectionId: EXP, id: "new" })
    );
    const added = exp(state, "new");
    expect(added).toEqual({
      id: "new",
      fields: {},
      bullets: [],
      tags: [],
      shouldShow: true,
    });
    expect(state.sections.find((s) => s.id === EXP)!.items.at(-1)!.id).toBe(
      "new"
    );
  });

  it("adds an item with given fields, hidden, and a generated id", () => {
    const state = vaultReducer(
      freshVault(),
      addItem({ sectionId: EXP, fields: { company: "X" }, shouldShow: false })
    );
    const added = state.sections.find((s) => s.id === EXP)!.items.at(-1)!;
    expect(added.id).toBeTruthy();
    expect(added.fields).toEqual({ company: "X" });
    expect(added.shouldShow).toBe(false);
  });

  it("removes an item", () => {
    const state = vaultReducer(freshVault(), removeItem(ref));
    expect(
      state.sections.find((s) => s.id === EXP)!.items.map((i) => i.id)
    ).toEqual(["exp-2", "exp-3"]);
  });

  it("merges fields and keeps the others", () => {
    const state = vaultReducer(
      freshVault(),
      updateItemFields({
        ...ref,
        fields: { company: "New Ltd", endDate: "2024-01-01" },
      })
    );
    expect(exp(state).fields).toMatchObject({
      company: "New Ltd",
      endDate: "2024-01-01",
      jobTitle: "Senior Software Developer",
    });
  });

  it("moves an item and keeps all ids", () => {
    const before = freshVault();
    const state = vaultReducer(before, moveItem({ ...ref, toIndex: 2 }));
    const items = state.sections.find((s) => s.id === EXP)!.items;
    expect(items.map((i) => i.id)).toEqual(["exp-2", "exp-3", "exp-1"]);
    expect(items[2]).toEqual(exp(before));
  });

  it("toggles visibility only for that item", () => {
    const state = vaultReducer(
      freshVault(),
      setItemVisibility({ ...ref, shouldShow: false })
    );
    expect(exp(state).shouldShow).toBe(false);
    expect(exp(state, "exp-2").shouldShow).toBe(true);
    expect(exp(state, "exp-3").shouldShow).toBe(false);
  });

  it("sets normalized tags", () => {
    const state = vaultReducer(
      freshVault(),
      setItemTags({ ...ref, tags: [" react ", "React", "", "leadership"] })
    );
    expect(exp(state).tags).toEqual(["react", "leadership"]);
  });

  it("sets and clears private notes and opinion", () => {
    let state = vaultReducer(
      freshVault(),
      setItemNotes({ ...ref, notes: "hm" })
    );
    state = vaultReducer(state, setItemOpinion({ ...ref, opinion: "love" }));
    expect(exp(state).notes).toBe("hm");
    expect(exp(state).opinion).toBe("love");
    state = vaultReducer(state, setItemNotes({ ...ref, notes: "" }));
    state = vaultReducer(state, setItemOpinion({ ...ref }));
    expect(exp(state)).not.toHaveProperty("notes");
    expect(exp(state)).not.toHaveProperty("opinion");
  });

  it("ignores unknown section or item ids", () => {
    const before = freshVault();
    const bad = { sectionId: "nope", itemId: "exp-1" };
    const badItem = { sectionId: EXP, itemId: "nope" };
    for (const r of [bad, badItem]) {
      expect(vaultReducer(before, removeItem(r))).toEqual(before);
      expect(
        vaultReducer(before, updateItemFields({ ...r, fields: { a: "b" } }))
      ).toEqual(before);
      expect(vaultReducer(before, moveItem({ ...r, toIndex: 0 }))).toEqual(
        before
      );
      expect(
        vaultReducer(before, setItemVisibility({ ...r, shouldShow: false }))
      ).toEqual(before);
      expect(vaultReducer(before, setItemTags({ ...r, tags: ["x"] }))).toEqual(
        before
      );
      expect(vaultReducer(before, addBullet(r))).toEqual(before);
    }
    expect(vaultReducer(before, addItem({ sectionId: "nope" }))).toEqual(
      before
    );
  });

  it("does not mutate the previous state", () => {
    const before = freshVault();
    const snapshot = JSON.stringify(before);
    vaultReducer(before, removeItem(ref));
    vaultReducer(
      before,
      updateItemFields({ ...ref, fields: { company: "Z" } })
    );
    vaultReducer(before, moveItem({ ...ref, toIndex: 2 }));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("bullets", () => {
  it("starts from the expected bullet ids", () => {
    expect(exp(freshVault()).bullets.map((b) => b.id)).toEqual([
      "gen-4",
      "gen-5",
      "gen-6",
    ]);
  });

  it("adds a bullet with defaults", () => {
    const state = vaultReducer(
      freshVault(),
      addBullet({ ...ref, id: "b-new" })
    );
    expect(exp(state).bullets.at(-1)).toEqual({
      id: "b-new",
      text: "",
      tags: [],
    });
  });

  it("adds a bullet with text and a generated id", () => {
    const state = vaultReducer(
      freshVault(),
      addBullet({ ...ref, text: "Hello" })
    );
    const bullet = exp(state).bullets.at(-1)!;
    expect(bullet.text).toBe("Hello");
    expect(bullet.id).toBeTruthy();
  });

  it("updates text, tags and rating independently", () => {
    let state = vaultReducer(
      freshVault(),
      updateBullet({ ...bulletRef, update: { text: "Changed" } })
    );
    state = vaultReducer(
      state,
      updateBullet({
        ...bulletRef,
        update: { tags: ["a", "A", "b"], rating: 4 },
      })
    );
    expect(exp(state).bullets[0]).toMatchObject({
      text: "Changed",
      tags: ["a", "b"],
      rating: 4,
    });
    expect(exp(state).bullets[1].text).toBe(
      "Introduced Redux Toolkit and cut state-related bugs"
    );
  });

  it("keeps the canonical text when setting alternative wordings", () => {
    const original = exp(freshVault()).bullets[0].text;
    let state = vaultReducer(
      freshVault(),
      setBulletAlt({ ...bulletRef, kind: "short", text: "Led dashboard" })
    );
    state = vaultReducer(
      state,
      setBulletAlt({
        ...bulletRef,
        kind: "formal",
        text: "Directed dashboard development",
      })
    );
    expect(exp(state).bullets[0].text).toBe(original);
    expect(exp(state).bullets[0].alt).toEqual({
      short: "Led dashboard",
      formal: "Directed dashboard development",
    });
  });

  it("removes an alternative wording with empty text, and the alt object when none is left", () => {
    let state = vaultReducer(
      freshVault(),
      setBulletAlt({ ...bulletRef, kind: "short", text: "S" })
    );
    state = vaultReducer(
      state,
      setBulletAlt({ ...bulletRef, kind: "long", text: "L" })
    );
    state = vaultReducer(
      state,
      setBulletAlt({ ...bulletRef, kind: "short", text: "  " })
    );
    expect(exp(state).bullets[0].alt).toEqual({ long: "L" });
    state = vaultReducer(
      state,
      setBulletAlt({ ...bulletRef, kind: "long", text: "" })
    );
    expect(exp(state).bullets[0]).not.toHaveProperty("alt");
  });

  it("removes a bullet", () => {
    const state = vaultReducer(freshVault(), removeBullet(bulletRef));
    expect(exp(state).bullets.map((b) => b.id)).toEqual(["gen-5", "gen-6"]);
  });

  it("moves a bullet and keeps ids and content", () => {
    const before = freshVault();
    const state = vaultReducer(
      before,
      moveBullet({ ...bulletRef, toIndex: 2 })
    );
    expect(exp(state).bullets.map((b) => b.id)).toEqual([
      "gen-5",
      "gen-6",
      "gen-4",
    ]);
    expect(exp(state).bullets[2]).toEqual(exp(before).bullets[0]);
  });

  it("ignores unknown bullet ids", () => {
    const before = freshVault();
    const bad = { ...ref, bulletId: "nope" };
    expect(
      vaultReducer(before, updateBullet({ ...bad, update: { text: "x" } }))
    ).toEqual(before);
    expect(
      vaultReducer(before, setBulletAlt({ ...bad, kind: "short", text: "x" }))
    ).toEqual(before);
    expect(vaultReducer(before, removeBullet(bad))).toEqual(before);
    expect(vaultReducer(before, moveBullet({ ...bad, toIndex: 0 }))).toEqual(
      before
    );
  });
});

describe("skills sections keep ratings through edits", () => {
  it("updates a skill rating", () => {
    const state = vaultReducer(
      freshVault(),
      updateBullet({
        sectionId: "skills",
        itemId: "sk-2",
        bulletId: "sk-2-2",
        update: { rating: 3 },
      })
    );
    const skill = state.sections.find((s) => s.id === "skills")!.items[1]
      .bullets[1];
    expect(skill).toMatchObject({ text: "TypeScript", rating: 3 });
  });
});
