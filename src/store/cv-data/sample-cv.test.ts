import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { CVJsonSchema } from "@custom-types/json-types";
import {
  cvDataReducer,
  initialState,
  setStyle,
} from "@store/cv-data/cv-data-slice";
import { migrateCvFile } from "@store/vault/migrate-vault";
import {
  initialState as vaultInitialState,
  setVault,
  vaultReducer,
} from "@store/vault/vault-slice";

describe("fixtures/sample-cv.json", () => {
  it("is valid against the current CV schema", () => {
    expect(() => CVJsonSchema.check(sample)).not.toThrow();
  });

  it("loads into the store the way the dev loader does", () => {
    const file = migrateCvFile(sample);
    const vault = vaultReducer(vaultInitialState, setVault(file.vault));
    const cvData = cvDataReducer(initialState, setStyle(file.style));
    expect(vault.profile.fullName).toBe("Jane Doe");
    expect(
      vault.sections.find((s) => s.id === "experience")!.items
    ).toHaveLength(3);
    expect(cvData.style).toEqual(file.style);
  });

  it("uses only reserved example email domains", () => {
    const parsed = CVJsonSchema.check(sample);
    expect(parsed.data.contactInfo.email).toMatch(/@example\.(com|org|net)$/);
  });
});
