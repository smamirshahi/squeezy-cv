import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import {
  addBullet,
  addItem,
  updateBullet,
  updateItemFields,
  initialState,
  setItemBullets,
  setLinks,
  setProfile,
  setSection,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import { createDefaultVault } from "@shared/vault/default-vault";
import { migrateCvFile, migrateLegacyFile } from "@shared/vault/migrate-vault";
import { replaceBulletTexts } from "@shared/vault/vault-utils";
import {
  SECTION_TYPES,
  SECTION_TYPE_LABELS,
  SPECIAL_SECTION_TYPES,
  getDefaultSectionTitle,
} from "@store/vault/section-types";
import {
  createCvFile,
  parseCvFileText,
  serializeCvFile,
} from "@shared/vault/cv-file";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { shouldShowApplyButton } from "@pages/editor-page/editor-footer-utils";
import { CURRENT_VAULT_VERSION, VaultSchema } from "@custom-types/vault-types";

function freshVault(): VaultState {
  let n = 0;
  return migrateLegacyFile(sample, () => `gen-${++n}`).vault;
}

describe("default vault", () => {
  it("is valid and has the seven usual sections with the preview headings", () => {
    const vault = createDefaultVault();
    expect(() => VaultSchema.check(vault)).not.toThrow();
    expect(vault.sections.map((s) => [s.id, s.type, s.title])).toEqual([
      ["summary", "summary", "Professional Summary"],
      ["experience", "experience", "Work Experience"],
      ["education", "education", "Education"],
      ["skills", "skills", "Skills"],
      ["publications", "publications", "Publications"],
      ["awards", "awards", "Awards"],
      ["interests", "interests", "Personal Interests"],
    ]);
  });

  it("is what the vault slice starts with and returns fresh objects", () => {
    expect(initialState).toEqual(createDefaultVault());
    expect(createDefaultVault()).not.toBe(createDefaultVault());
  });

  it("uses the same section ids as the migration, so structures stay valid", () => {
    // a migrated file has no publications, awards or interests; the default vault adds those on top
    const defaults = createDefaultVault().sections.map((s) => s.id);
    expect(freshVault().sections.map((s) => s.id)).toEqual(
      defaults.filter(
        (id) => !["publications", "awards", "interests"].includes(id)
      )
    );
  });
});

describe("applying drafts", () => {
  it("setSection replaces only the section with that id", () => {
    const before = freshVault();
    const edited = { ...before.sections[1], title: "Jobs" };
    const after = vaultReducer(before, setSection(edited));
    expect(after.sections[1].title).toBe("Jobs");
    expect(after.sections.map((s) => s.id)).toEqual(
      before.sections.map((s) => s.id)
    );
    expect(after.sections[0]).toEqual(before.sections[0]);
  });

  it("setSection ignores an unknown section", () => {
    const before = freshVault();
    const stranger = {
      id: "nope",
      type: "custom" as const,
      title: "X",
      items: [],
    };
    expect(vaultReducer(before, setSection(stranger))).toEqual(before);
  });

  it("setProfile replaces the profile, including clearing optional fields", () => {
    const after = vaultReducer(
      freshVault(),
      setProfile({ fullName: "Only Name" })
    );
    expect(after.profile).toEqual({ fullName: "Only Name" });
  });

  it("setLinks replaces the links", () => {
    const after = vaultReducer(
      freshVault(),
      setLinks([
        { id: "l", label: "Site", url: "https://example.com", tags: [] },
      ])
    );
    expect(after.links.map((l) => l.label)).toEqual(["Site"]);
  });

  it("addBullet can set a rating, and omits it otherwise", () => {
    const ref = { sectionId: "skills", itemId: "sk-1" };
    let state = vaultReducer(
      freshVault(),
      addBullet({ ...ref, id: "r", text: "Rust", rating: 3 })
    );
    state = vaultReducer(state, addBullet({ ...ref, id: "n", text: "Go" }));
    const bullets = state.sections.find((s) => s.id === "skills")!.items[0]
      .bullets;
    expect(bullets.find((b) => b.id === "r")).toMatchObject({
      text: "Rust",
      rating: 3,
    });
    expect(bullets.find((b) => b.id === "n")).not.toHaveProperty("rating");
  });

  it("setItemBullets replaces the bullets of one item", () => {
    const after = vaultReducer(
      freshVault(),
      setItemBullets({
        sectionId: "experience",
        itemId: "exp-1",
        bullets: [{ id: "only", text: "One", tags: [] }],
      })
    );
    const exp = after.sections.find((s) => s.id === "experience")!;
    expect(exp.items[0].bullets.map((b) => b.id)).toEqual(["only"]);
    expect(exp.items[1].bullets.length).toBe(2);
  });
});

describe("replaceBulletTexts", () => {
  const bullets = [
    { id: "a", text: "A", tags: ["t"], alt: { short: "a" } },
    { id: "b", text: "B", tags: [] },
  ];
  function ids(): () => string {
    let n = 0;
    return () => `new-${++n}`;
  }

  it("keeps id, tags and alternative wordings when only the text changes", () => {
    const result = replaceBulletTexts(bullets, ["A2", "B"], ids());
    expect(result[0]).toEqual({
      id: "a",
      text: "A2",
      tags: ["t"],
      alt: { short: "a" },
    });
    expect(result[1]).toEqual(bullets[1]);
  });

  it("adds new bullets for extra lines and drops removed ones", () => {
    expect(
      replaceBulletTexts(bullets, ["A", "B", "C"], ids()).map((b) => b.id)
    ).toEqual(["a", "b", "new-1"]);
    expect(replaceBulletTexts(bullets, ["A"], ids()).map((b) => b.id)).toEqual([
      "a",
    ]);
    expect(replaceBulletTexts(bullets, [], ids())).toEqual([]);
  });

  it("does not mutate its input", () => {
    const snapshot = JSON.stringify(bullets);
    replaceBulletTexts(bullets, ["x", "y", "z"], ids());
    expect(JSON.stringify(bullets)).toBe(snapshot);
  });
});

describe("cv file", () => {
  it("round-trips through the saved text", () => {
    const file = createCvFile(
      migrateCvFile(sample).vault,
      { title: "T", jobUrl: "u", version: "1.0" },
      migrateLegacyFile(sample).style
    );
    expect(parseCvFileText(serializeCvFile(file))).toEqual(file);
  });

  it("reads legacy files and rejects broken text", () => {
    expect(parseCvFileText(JSON.stringify(sample)).vault.version).toBe(
      CURRENT_VAULT_VERSION
    );
    expect(() => parseCvFileText("{not json")).toThrow();
    expect(() => parseCvFileText("[]")).toThrow();
  });
});

describe("labels", () => {
  const sections = freshVault().sections;

  it("names header parts and sections", () => {
    expect(getPreviewPartLabel("personalInfo", sections)).toBe("Personal Info");
    expect(getPreviewPartLabel("contactInfo", sections)).toBe("Contact Info");
    expect(getPreviewPartLabel("experience", sections)).toBe("Work Experience");
  });

  it("falls back to the id for unknown parts", () => {
    expect(getPreviewPartLabel("gone", sections)).toBe("gone");
  });

  it("shows Apply and Discard only on pages that edit a draft", () => {
    expect(shouldShowApplyButton("styleSettings")).toBe(false);
    expect(shouldShowApplyButton("sections")).toBe(false);
    expect(shouldShowApplyButton("mainInfo")).toBe(true);
    expect(shouldShowApplyButton("summary")).toBe(true);
  });
});

describe("section types", () => {
  it("has a label for every type and a default title", () => {
    for (const type of SECTION_TYPES) {
      expect(SECTION_TYPE_LABELS[type]).toBeTruthy();
      expect(getDefaultSectionTitle(type)).toBe(SECTION_TYPE_LABELS[type]);
    }
    expect(SECTION_TYPES).toHaveLength(11);
  });

  it("knows which types have a special layout", () => {
    expect(SPECIAL_SECTION_TYPES).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
    ]);
  });
});

describe("skills stay sorted by level", () => {
  function skillsVault(): VaultState {
    const vault = createDefaultVault();
    const skills = vault.sections.find((s) => s.type === "skills")!;
    skills.items.push({
      id: "g",
      fields: { category: "Tools" },
      bullets: [
        { id: "a", text: "A", tags: [], rating: 2 },
        { id: "b", text: "B", tags: [], rating: 4 },
        { id: "c", text: "C", tags: [] },
      ],
      tags: [],
      shouldShow: true,
    });
    return vault;
  }
  const ref = { sectionId: "skills", itemId: "g" };
  const order = (state: VaultState): string[] =>
    state.sections
      .find((s) => s.id === "skills")!
      .items[0].bullets.map((b) => b.id);

  it("moves a skill up when its level goes up, ties keep their order", () => {
    let state = skillsVault();
    state = vaultReducer(
      state,
      updateBullet({ ...ref, bulletId: "c", update: { rating: 4 } })
    );
    expect(order(state)).toEqual(["b", "c", "a"]);
    state = vaultReducer(
      state,
      updateBullet({ ...ref, bulletId: "a", update: { rating: 5 } })
    );
    expect(order(state)).toEqual(["a", "b", "c"]);
  });

  it("does not reorder when only the text changes, nor outside skills", () => {
    let state = skillsVault();
    state = vaultReducer(
      state,
      updateBullet({ ...ref, bulletId: "c", update: { text: "Cc" } })
    );
    expect(order(state)).toEqual(["a", "b", "c"]);

    const projects = vaultReducer(
      createDefaultVault(),
      addItem({ sectionId: "publications", fields: {} })
    );
    expect(
      projects.sections.find((s) => s.id === "publications")!.items
    ).toHaveLength(1);
  });

  it("keeps publications and awards newest year first when items are added or edited", () => {
    let state = createDefaultVault();
    for (const year of ["2016", "2022", "2018"]) {
      state = vaultReducer(
        state,
        addItem({ sectionId: "publications", fields: { year } })
      );
    }
    const years = () =>
      state.sections
        .find((s) => s.id === "publications")!
        .items.map((i) => i.fields.year);
    expect(years()).toEqual(["2022", "2018", "2016"]);
    const oldest = state.sections.find((s) => s.id === "publications")!
      .items[2];
    state = vaultReducer(
      state,
      updateItemFields({
        sectionId: "publications",
        itemId: oldest.id,
        fields: { year: "2030" },
      })
    );
    expect(years()).toEqual(["2030", "2022", "2018"]);
  });
});
