import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateLegacyFile } from "@shared/vault/migrate-vault";
import {
  addLink,
  moveLink,
  removeLink,
  updateLink,
  updateProfile,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import { getLinkDisplayText } from "@shared/vault/link-utils";

function freshVault(): VaultState {
  let n = 0;
  return migrateLegacyFile(sample, () => `gen-${++n}`).vault;
}

function labels(state: VaultState): string[] {
  return state.links.map((l) => l.label);
}

describe("links", () => {
  it("starts with the migrated LinkedIn and GitHub links", () => {
    expect(labels(freshVault())).toEqual(["LinkedIn", "GitHub"]);
  });

  it("adds any number of links at the end", () => {
    let state = vaultReducer(
      freshVault(),
      addLink({ id: "x", label: "Portfolio", url: "https://jane.example.com" })
    );
    state = vaultReducer(
      state,
      addLink({ label: "Scholar", url: "https://scholar.example.org/jane" })
    );
    expect(labels(state)).toEqual([
      "LinkedIn",
      "GitHub",
      "Portfolio",
      "Scholar",
    ]);
    expect(state.links[2]).toEqual({
      id: "x",
      label: "Portfolio",
      url: "https://jane.example.com",
      tags: [],
    });
    expect(state.links[3].id).toBeTruthy();
    expect(state.links[3].id).not.toBe("x");
  });

  it("adds an empty link ready for editing", () => {
    const state = vaultReducer(freshVault(), addLink({}));
    expect(state.links.at(-1)).toMatchObject({ label: "", url: "", tags: [] });
  });

  it("updates label, url and tags separately", () => {
    const id = freshVault().links[0].id;
    let state = vaultReducer(
      freshVault(),
      updateLink({ id, update: { label: "LinkedIn profile" } })
    );
    state = vaultReducer(
      state,
      updateLink({
        id,
        update: { url: "https://example.com/in/jane", tags: [" a ", "A", "b"] },
      })
    );
    expect(state.links[0]).toEqual({
      id,
      label: "LinkedIn profile",
      url: "https://example.com/in/jane",
      tags: ["a", "b"],
    });
    expect(state.links[1].label).toBe("GitHub");
  });

  it("removes a link", () => {
    const id = freshVault().links[0].id;
    expect(labels(vaultReducer(freshVault(), removeLink({ id })))).toEqual([
      "GitHub",
    ]);
  });

  it("reorders links and keeps ids", () => {
    const before = freshVault();
    const state = vaultReducer(
      before,
      moveLink({ id: before.links[0].id, toIndex: 1 })
    );
    expect(labels(state)).toEqual(["GitHub", "LinkedIn"]);
    expect(state.links[1]).toEqual(before.links[0]);
  });

  it("ignores unknown ids and does not mutate", () => {
    const before = freshVault();
    const snapshot = JSON.stringify(before);
    expect(
      vaultReducer(before, updateLink({ id: "x", update: { label: "q" } }))
    ).toEqual(before);
    expect(vaultReducer(before, removeLink({ id: "x" }))).toEqual(before);
    expect(vaultReducer(before, moveLink({ id: "x", toIndex: 0 }))).toEqual(
      before
    );
    vaultReducer(before, removeLink({ id: before.links[0].id }));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("profile", () => {
  it("merges values and keeps the rest", () => {
    const state = vaultReducer(
      freshVault(),
      updateProfile({ phone: "123", headline: "Dev" })
    );
    expect(state.profile).toMatchObject({
      fullName: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "123",
      headline: "Dev",
    });
  });

  it("clears an optional field with undefined", () => {
    const state = vaultReducer(
      freshVault(),
      updateProfile({ phone: undefined })
    );
    expect(state.profile.phone).toBeUndefined();
  });
});

describe("link display", () => {
  it("shows the full url when asked", () => {
    expect(getLinkDisplayText("https://github.com/jane", true)).toBe(
      "https://github.com/jane"
    );
  });

  it.each([
    ["https://www.linkedin.com/in/jane", "jane"],
    ["https://github.com/jane/", "jane"],
    ["https://www.jane.example.com", "jane.example.com"],
    ["jane.example.com/portfolio", "portfolio"],
  ])("shortens %s to %s", (url, text) => {
    expect(getLinkDisplayText(url, false)).toBe(text);
  });

  it("returns text it cannot parse unchanged", () => {
    expect(getLinkDisplayText("not a url at all", false)).toBe(
      "not a url at all"
    );
  });
});
