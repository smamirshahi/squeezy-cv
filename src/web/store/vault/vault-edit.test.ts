import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import {
  addBullet,
  initialState,
  setItemBullets,
  setLinks,
  setProfile,
  setSection,
  vaultReducer,
  VaultState,
} from "@store/vault/vault-slice";
import { createDefaultVault } from "@shared/vault/default-vault";
import { migrateLegacyFile } from "@shared/vault/migrate-vault";
import { collectTags, replaceBulletTexts } from "@shared/vault/vault-utils";
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
import { getAddButtonLabel } from "@pages/editor-page/editor-footer-utils";
import { VaultSchema } from "@custom-types/vault-types";

function freshVault(): VaultState {
  let n = 0;
  return migrateLegacyFile(sample, () => `gen-${++n}`).vault;
}

describe("default vault", () => {
  it("is valid and has the four usual sections with the preview headings", () => {
    const vault = createDefaultVault();
    expect(() => VaultSchema.check(vault)).not.toThrow();
    expect(vault.sections.map((s) => [s.id, s.type, s.title])).toEqual([
      ["summary", "summary", "Professional Summary"],
      ["experience", "experience", "Work Experience"],
      ["education", "education", "Education"],
      ["skills", "skills", "Skills"],
    ]);
  });

  it("is what the vault slice starts with and returns fresh objects", () => {
    expect(initialState).toEqual(createDefaultVault());
    expect(createDefaultVault()).not.toBe(createDefaultVault());
  });

  it("uses the same section ids as the migration, so structures stay valid", () => {
    expect(freshVault().sections.map((s) => s.id)).toEqual(
      createDefaultVault().sections.map((s) => s.id)
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
      freshVault(),
      { title: "T", jobUrl: "u", version: "1.0" },
      migrateLegacyFile(sample).style
    );
    expect(parseCvFileText(serializeCvFile(file))).toEqual(file);
  });

  it("reads legacy files and rejects broken text", () => {
    expect(parseCvFileText(JSON.stringify(sample)).vault.version).toBe(1);
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

  it("decides footer buttons per page", () => {
    expect(
      getAddButtonLabel("styleSettings", sections).shouldShowApplyButton
    ).toBe(false);
    expect(
      getAddButtonLabel("pageStructure", sections).shouldShowApplyButton
    ).toBe(false);
    expect(getAddButtonLabel("mainInfo", sections).addNewItemButtonLabel).toBe(
      "Add new link"
    );
    expect(
      getAddButtonLabel("experience", sections).addNewItemButtonLabel
    ).toBe("Add new experience");
    expect(getAddButtonLabel("education", sections).addNewItemButtonLabel).toBe(
      "Add new education"
    );
    expect(getAddButtonLabel("skills", sections).addNewItemButtonLabel).toBe(
      "Add new skill category"
    );
    expect(getAddButtonLabel("sections", sections).shouldShowApplyButton).toBe(
      false
    );
    expect(
      getAddButtonLabel("proj", [
        ...sections,
        { id: "proj", type: "projects", title: "P", items: [] },
      ]).addNewItemButtonLabel
    ).toBe("Add new item");
    expect(getAddButtonLabel("summary", sections)).toEqual({
      shouldShowApplyButton: true,
      addNewItemButtonLabel: "",
    });
    expect(getAddButtonLabel("metaData", sections).addNewItemButtonLabel).toBe(
      ""
    );
  });
});

describe("collectTags", () => {
  it("collects distinct tags from items, bullets and links, sorted, case-insensitive", () => {
    const vault = freshVault();
    vault.links[0].tags = ["Web"];
    vault.sections[1].items[0].tags = ["react", "Leadership"];
    vault.sections[1].items[1].tags = ["REACT", "ci-cd"];
    vault.sections[1].items[0].bullets[0].tags = ["testing", "web"];
    expect(collectTags(vault)).toEqual([
      "ci-cd",
      "Leadership",
      "react",
      "testing",
      "Web",
    ]);
  });

  it("returns nothing for a vault without tags", () => {
    expect(collectTags(freshVault())).toEqual([]);
  });
});

describe("section types", () => {
  it("has a label for every type and a default title", () => {
    for (const type of SECTION_TYPES) {
      expect(SECTION_TYPE_LABELS[type]).toBeTruthy();
      expect(getDefaultSectionTitle(type)).toBe(SECTION_TYPE_LABELS[type]);
    }
    expect(SECTION_TYPES).toHaveLength(9);
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
