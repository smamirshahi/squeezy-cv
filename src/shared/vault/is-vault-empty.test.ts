import { describe, expect, it } from "vitest";
import { isVaultEmpty } from "@shared/vault/is-vault-empty";
import { createDefaultVault } from "@shared/vault/default-vault";

describe("isVaultEmpty", () => {
  it("is true for a new vault", () => {
    expect(isVaultEmpty(createDefaultVault())).toBe(true);
  });

  it("is false once there is a name", () => {
    const vault = createDefaultVault();
    vault.profile.fullName = "Alex";
    expect(isVaultEmpty(vault)).toBe(false);
  });

  it("is false once a section has an item", () => {
    const vault = createDefaultVault();
    vault.sections[1].items.push({
      id: "x",
      fields: {},
      bullets: [],
      tags: [],
      shouldShow: true,
    });
    expect(isVaultEmpty(vault)).toBe(false);
  });
});
