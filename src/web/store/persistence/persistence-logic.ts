import { MetaData } from "@custom-types/json-types";
import { Style } from "@custom-types/styles-types";
import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { createCvFile } from "@shared/vault/cv-file";

/** What is on disk (or about to be), as text, so it can be compared cheaply */
export interface SavedState {
  vault: string;
  variants: Record<string, string>;
}

/** The text of the files for the current data */
export function toSavedState(
  vault: Vault,
  metaData: MetaData,
  style: Style,
  variants: Variant[]
): SavedState {
  return {
    vault: JSON.stringify(createCvFile(vault, metaData, style)),
    variants: Object.fromEntries(
      variants.map((v) => [v.id, JSON.stringify(v)])
    ),
  };
}

export interface SavePlan {
  shouldSaveVault: boolean;
  variantsToSave: string[];
  variantsToDelete: string[];
}

/** What has to be written so that disk matches `current`. `saved` null means nothing is on disk yet. */
export function planSave(
  saved: SavedState | null,
  current: SavedState
): SavePlan {
  const savedVariants = saved?.variants ?? {};
  return {
    shouldSaveVault: saved?.vault !== current.vault,
    variantsToSave: Object.keys(current.variants).filter(
      (id) => savedVariants[id] !== current.variants[id]
    ),
    variantsToDelete: Object.keys(savedVariants).filter(
      (id) => !(id in current.variants)
    ),
  };
}

/** True if anything differs from what is on disk */
export function isDirty(
  saved: SavedState | null,
  current: SavedState
): boolean {
  const plan = planSave(saved, current);
  return (
    plan.shouldSaveVault ||
    plan.variantsToSave.length > 0 ||
    plan.variantsToDelete.length > 0
  );
}
