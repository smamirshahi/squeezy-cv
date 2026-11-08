import sample from "@fixtures/sample-cv.json";
import { CvFile } from "@custom-types/vault-types";
import { CURRENT_VAULT_VERSION } from "@custom-types/vault-types";
import { migrateLegacyFile } from "@shared/vault/migrate-vault";

/**
 * The sample CV with bullet points on its experience items. Since vault version 2 the migration
 * turns an item's bullets into its description, but the bullet engine (job wording, hiding,
 * order, tailoring, chat) still works on any item that has bullets, so tests of that engine use
 * this instead of the migrated sample.
 */
export function sampleFileWithBullets(): CvFile {
  const legacy = migrateLegacyFile(sample);
  return {
    ...legacy,
    vault: { ...legacy.vault, version: CURRENT_VAULT_VERSION },
  };
}
