import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { Item } from "@custom-types/vault-types";
import { migrateLegacyFile } from "@shared/vault/migrate-vault";
import {
  addBullet,
  addItem,
  moveBullet,
  moveBulletToItem,
  moveItem,
  removeBullet,
  removeItem,
  setBulletAlt,
  setItemTags,
  setItemVisibility,
  updateBullet,
  updateItemFields,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import {
  moveInArray,
  normalizeTags,
  sortedSection,
  withDatedSectionsSorted,
} from "@shared/vault/vault-utils";

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

describe("date order of work experience and education", () => {
  it("sorts by end date (none = current first), then start date, and re-sorts on a date change", () => {
    let state = vaultReducer(
      freshVault(),
      addItem({
        sectionId: EXP,
        id: "late",
        fields: { startDate: "2019-01-01", endDate: "2022-02-28" },
      })
    );
    const ids = (): string[] =>
      state.sections.find((s) => s.id === EXP)!.items.map((i) => i.id);
    // same end date as exp-2: the later start comes first
    expect(ids()).toEqual(["exp-1", "late", "exp-2", "exp-3"]);

    state = vaultReducer(
      state,
      updateItemFields({
        sectionId: EXP,
        itemId: "exp-3",
        fields: { endDate: "2024-01-01" },
      })
    );
    expect(ids()).toEqual(["exp-1", "exp-3", "late", "exp-2"]);
  });

  it("leaves other section types in the order they have", () => {
    const vault = freshVault();
    expect(withDatedSectionsSorted(vault)).toBe(vault);
    const skills = freshVault().sections.find((s) => s.type === "skills")!;
    expect(sortedSection(skills)).toBe(skills);
  });
});

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
    // No end date = current: after the current role (later start), before the ended ones
    expect(
      state.sections.find((s) => s.id === EXP)!.items.map((i) => i.id)
    ).toEqual(["exp-1", "new", "exp-2", "exp-3"]);
  });

  it("adds an item with given fields, hidden, and a generated id", () => {
    const state = vaultReducer(
      freshVault(),
      addItem({ sectionId: EXP, fields: { company: "X" }, shouldShow: false })
    );
    const added = state.sections
      .find((s) => s.id === EXP)!
      .items.find((i) => i.fields.company === "X")!;
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

describe("moving a skill to another category", () => {
  function skills(): { state: VaultState; sectionId: string; items: Item[] } {
    const state = freshVault();
    const section = state.sections.find((s) => s.type === "skills")!;
    return { state, sectionId: section.id, items: section.items };
  }

  it("moves the skill with its level to the end of the other category", () => {
    const { state, sectionId, items } = skills();
    const [from, to] = items;
    const bullet = from.bullets[0];
    const next = vaultReducer(
      state,
      moveBulletToItem({
        sectionId,
        itemId: from.id,
        bulletId: bullet.id,
        toItemId: to.id,
      })
    );
    const section = next.sections.find((s) => s.id === sectionId)!;
    const after = (id: string): Item => section.items.find((i) => i.id === id)!;
    expect(after(from.id).bullets.map((b) => b.id)).not.toContain(bullet.id);
    expect(after(to.id).bullets.at(-1)).toEqual(bullet);
    expect(after(to.id).bullets).toHaveLength(to.bullets.length + 1);
  });

  it("does nothing for the same category or an unknown one", () => {
    const { state, sectionId, items } = skills();
    const [from] = items;
    const base = {
      sectionId,
      itemId: from.id,
      bulletId: from.bullets[0].id,
    };
    expect(
      vaultReducer(state, moveBulletToItem({ ...base, toItemId: from.id }))
    ).toEqual(state);
    expect(
      vaultReducer(state, moveBulletToItem({ ...base, toItemId: "nope" }))
    ).toEqual(state);
  });
});
