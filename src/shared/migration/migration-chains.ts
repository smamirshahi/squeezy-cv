import { CURRENT_APPLICATION_VERSION } from "@custom-types/application-types";
import { CURRENT_CANDIDATE_VERSION } from "@custom-types/candidate-types";
import { CURRENT_JOB_VERSION } from "@custom-types/job-types";
import { CURRENT_TEMPLATE_VERSION } from "@custom-types/template-types";
import { CURRENT_VAULT_VERSION } from "@custom-types/vault-types";
import {
  FileKind,
  assertNotNewer,
  readExportMeta,
} from "@shared/migration/export-meta";
import {
  MigrationStep,
  runMigrations,
} from "@shared/migration/migration-registry";
import { APP_VERSION } from "@shared/version";

/** The kinds that are one JSON object with a `version` field (the vault chain lives in `migrate-vault.ts`) */
export type ChainKind = "job" | "template" | "application" | "candidate";

interface Chain {
  /** The format version this app writes and reads */
  current: number;
  /** One step per past version, in order. Adding a format change = bump `current` and add a step here. */
  steps: MigrationStep[];
}

/**
 * The single place where the migration chains of the simple file kinds are registered. Every chain starts
 * empty at version 1. `migration-guard.test.ts` fails when `current` has no step from the version before.
 */
export const MIGRATION_CHAINS: Record<ChainKind, Chain> = {
  job: { current: CURRENT_JOB_VERSION, steps: [] },
  template: { current: CURRENT_TEMPLATE_VERSION, steps: [] },
  application: { current: CURRENT_APPLICATION_VERSION, steps: [] },
  candidate: { current: CURRENT_CANDIDATE_VERSION, steps: [] },
};

/** Every file kind with the current format version, for the guard test and for documentation */
export const CURRENT_FORMAT_VERSIONS: Record<FileKind, number> = {
  "cv-file": CURRENT_VAULT_VERSION,
  vault: CURRENT_VAULT_VERSION,
  job: CURRENT_JOB_VERSION,
  template: CURRENT_TEMPLATE_VERSION,
  application: CURRENT_APPLICATION_VERSION,
  candidate: CURRENT_CANDIDATE_VERSION,
};

/** What happened to a file that was made by an older version */
export interface UpgradeNotice {
  /** The app that wrote the file; undefined when the file has no `meta` (the oldest format) */
  fromAppVersion?: string;
  toAppVersion: string;
  fromFormat: number;
  toFormat: number;
}

/** "This file was made with CV Builder 0.5.0 and has been updated to 0.6.0." */
export function describeUpgrade(notice: UpgradeNotice): string {
  const from = notice.fromAppVersion
    ? `CV Builder ${notice.fromAppVersion}`
    : "an older version of CV Builder";
  return `This file was made with ${from} and has been updated to ${notice.toAppVersion}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Upgrades a job, template, application or candidate file to the current format. Throws a readable
 * message when the file is from a newer app. Anything that is not an object is returned as it is
 * (the schema check after it rejects it). `notice` is set only when a step had to run.
 */
export function upgradeFile(
  raw: unknown,
  kind: ChainKind
): { file: unknown; notice?: UpgradeNotice } {
  if (!isRecord(raw)) {
    return { file: raw };
  }
  assertNotNewer(raw);
  const { current, steps } = MIGRATION_CHAINS[kind];
  const meta = readExportMeta(raw);
  const stored = raw.version ?? meta?.formatVersion;
  const from = typeof stored === "number" ? stored : 1;
  if (from >= current) {
    // Too new a format version is left to runMigrations, which refuses it
    return from > current
      ? { file: runMigrations(raw, kind, from, current, steps) }
      : { file: raw };
  }
  const migrated = runMigrations(raw, kind, from, current, steps);
  return {
    file: { ...migrated, version: current },
    notice: {
      fromAppVersion: meta?.appVersion,
      toAppVersion: APP_VERSION,
      fromFormat: from,
      toFormat: current,
    },
  };
}
