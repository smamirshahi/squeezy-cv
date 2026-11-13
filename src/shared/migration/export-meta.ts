import { APP_VERSION } from "@shared/version";

/** The kinds of JSON file the app writes */
export type FileKind =
  | "cv-file"
  | "vault"
  | "job"
  | "template"
  | "application"
  | "candidate"
  | "backup";

/** Format version of the full backup file (the records inside carry their own versions) */
export const CURRENT_BACKUP_VERSION = 1;

/**
 * Written into every JSON file the app exports or saves, under the key `meta`. It says which
 * version of CV Builder wrote the file, so a later version knows which migration steps to run.
 * Not to be mixed up with `CvFile.metaData` (the job title, URL, opinion and notes of a CV).
 */
export interface ExportMeta {
  appVersion: string;
  /** Format version of the file's data (the vault version for CV files, otherwise `version`) */
  formatVersion: number;
  exportedAt: string;
  kind: FileKind;
}

const META_KEY = "meta";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses "1.2.3" into numbers; undefined when it is not a plain SemVer */
function parseVersion(text: string): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(text);
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : undefined;
}

/** -1, 0 or 1; undefined when either is not a version */
function compareVersions(a: string, b: string): number | undefined {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) {
    return undefined;
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
}

/** Builds the metadata for a file about to be written */
function createExportMeta(
  kind: FileKind,
  formatVersion: number,
  now: Date = new Date()
): ExportMeta {
  return {
    appVersion: APP_VERSION,
    formatVersion,
    exportedAt: now.toISOString(),
    kind,
  };
}

/** Returns a copy of `file` with the metadata added (an old `meta` is replaced) */
export function withExportMeta<T extends object>(
  file: T,
  kind: FileKind,
  formatVersion: number,
  now?: Date
): T & { meta: ExportMeta } {
  return { ...file, meta: createExportMeta(kind, formatVersion, now) };
}

/** The metadata of a file, or undefined for a file without (the oldest known format) */
export function readExportMeta(raw: unknown): ExportMeta | undefined {
  if (!isRecord(raw) || !isRecord(raw[META_KEY])) {
    return undefined;
  }
  const meta = raw[META_KEY];
  if (
    typeof meta.appVersion !== "string" ||
    typeof meta.formatVersion !== "number" ||
    typeof meta.kind !== "string"
  ) {
    return undefined;
  }
  return {
    appVersion: meta.appVersion,
    formatVersion: meta.formatVersion,
    exportedAt: typeof meta.exportedAt === "string" ? meta.exportedAt : "",
    kind: meta.kind as FileKind,
  };
}

/** Throws a readable message when the file was written by a newer app than this one */
export function assertNotNewer(
  raw: unknown,
  currentVersion: string = APP_VERSION
): void {
  const meta = readExportMeta(raw);
  if (meta && compareVersions(meta.appVersion, currentVersion) === 1) {
    throw new Error(
      `This file was made by CV Builder ${meta.appVersion}, but this app is ${currentVersion}. Update the app to open it.`
    );
  }
}

/** The file without its `meta`, so what is read back equals what the app works with */
export function withoutExportMeta<T extends object>(file: T): T {
  const { [META_KEY]: _meta, ...rest } = file as Record<string, unknown>;
  return rest as T;
}
