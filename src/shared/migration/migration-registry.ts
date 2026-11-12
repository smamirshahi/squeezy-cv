import { assertNotNewer, FileKind } from "@shared/migration/export-meta";

/** One step that upgrades a file of `kind` from format version `fromVersion` to `toVersion` */
export interface MigrationStep {
  kind: FileKind;
  fromVersion: number;
  toVersion: number;
  migrate: (json: Record<string, unknown>) => Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Applies the steps of `kind` in order, from `fromVersion` up to `currentVersion`.
 * Throws for a version that is newer than the current one, or when a step is missing.
 */
export function runMigrations(
  json: Record<string, unknown>,
  kind: FileKind,
  fromVersion: number,
  currentVersion: number,
  steps: MigrationStep[]
): Record<string, unknown> {
  if (fromVersion > currentVersion) {
    throw new Error(
      `This ${kind} is format version ${fromVersion}, but this app only supports up to ${currentVersion}. Update the app.`
    );
  }
  let current = json;
  let version = fromVersion;
  while (version < currentVersion) {
    const step = steps.find(
      (s) => s.kind === kind && s.fromVersion === version
    );
    if (!step) {
      throw new Error(
        `No migration for ${kind} from version ${version} to ${version + 1}.`
      );
    }
    const next = step.migrate(current);
    if (!isRecord(next)) {
      throw new Error(
        `Migration of ${kind} ${step.fromVersion} to ${step.toVersion} did not return an object.`
      );
    }
    current = next;
    version = step.toVersion;
  }
  return current;
}

/** Refuses a file made by a newer app, then returns it unchanged (the format chain does the rest) */
export function checkReadable(raw: unknown): void {
  assertNotNewer(raw);
}
