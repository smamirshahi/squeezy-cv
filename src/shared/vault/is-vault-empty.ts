import { Vault } from "@custom-types/vault-types";

/** True for a vault with no name, no links and no items: the state of a first run */
export function isVaultEmpty(vault: Vault): boolean {
  return (
    vault.profile.fullName.trim() === "" &&
    vault.links.length === 0 &&
    vault.sections.every((section) => section.items.length === 0)
  );
}
