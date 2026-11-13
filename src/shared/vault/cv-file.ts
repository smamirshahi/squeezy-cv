import { MetaData } from "@custom-types/json-types";
import { Style } from "@custom-types/styles-types";
import { CvFile, Vault } from "@custom-types/vault-types";
import {
  readExportMeta,
  withExportMeta,
  withoutExportMeta,
} from "@shared/migration/export-meta";
import { UpgradeNotice } from "@shared/migration/migration-chains";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { CURRENT_VAULT_VERSION } from "@custom-types/vault-types";
import { APP_VERSION } from "@shared/version";

/** Reads the text of a CV file (any supported version) into the current format. Throws if it cannot. */
export function parseCvFileText(text: string): CvFile {
  return parseCvFileTextWithNotice(text).file;
}

/** The format version a CV file was saved in: 0 for the oldest files, which have no vault yet */
function storedFormat(raw: unknown): number {
  if (typeof raw !== "object" || raw === null || !("vault" in raw)) {
    return 0;
  }
  const { vault } = raw as { vault?: { version?: unknown } };
  return typeof vault?.version === "number" ? vault.version : 0;
}

/** Like `parseCvFileText`, plus a notice when the file was made by an older format and has been upgraded */
export function parseCvFileTextWithNotice(text: string): {
  file: CvFile;
  notice?: UpgradeNotice;
} {
  const raw: unknown = JSON.parse(text);
  const file = withoutExportMeta(migrateCvFile(raw));
  const fromFormat = storedFormat(raw);
  if (fromFormat >= CURRENT_VAULT_VERSION) {
    return { file };
  }
  return {
    file,
    notice: {
      fromAppVersion: readExportMeta(raw)?.appVersion,
      toAppVersion: APP_VERSION,
      fromFormat,
      toFormat: CURRENT_VAULT_VERSION,
    },
  };
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
