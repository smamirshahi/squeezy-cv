import { MetaData } from "@custom-types/json-types";
import { Style } from "@custom-types/styles-types";
import { CvFile, Vault } from "@custom-types/vault-types";
import { withExportMeta } from "@shared/migration/export-meta";
import { migrateCvFile } from "@shared/vault/migrate-vault";

/** Reads the text of a CV file (any supported version) into the current format. Throws if it cannot. */
export function parseCvFileText(text: string): CvFile {
  return migrateCvFile(JSON.parse(text));
}

/** Builds the file that gets saved to disk */
export function createCvFile(
  vault: Vault,
  metaData: MetaData,
  style: Style
): CvFile {
  return { metaData, vault, style };
}

/** The text that gets saved to disk */
export function serializeCvFile(file: CvFile): string {
  return JSON.stringify(
    withExportMeta(file, "cv-file", file.vault.version),
    null,
    2
  );
}
