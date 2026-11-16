import {
  Application,
  ApplicationSchema,
} from "@custom-types/application-types";
import { Candidate, CandidateSchema } from "@custom-types/candidate-types";
import { CvFile } from "@custom-types/vault-types";
import { Job, JobSchema } from "@custom-types/job-types";
import { Template, TemplateSchema } from "@custom-types/template-types";
import {
  CURRENT_BACKUP_VERSION,
  assertNotNewer,
  readExportMeta,
  withExportMeta,
  withoutExportMeta,
} from "@shared/migration/export-meta";
import { ChainKind, upgradeFile } from "@shared/migration/migration-chains";
import { CvStorage, StorageError } from "@shared/storage/cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const BYTE_CHUNK = 0x8000;

interface BackupApplication {
  application: Application;
  /** The PDF that was sent, base64; left out when there is none */
  pdf?: string;
}

/**
 * Everything the app stores, in one JSON file: the vault, templates, jobs, candidates and
 * applications (with their PDFs). It never holds settings or AI keys.
 */
export interface FullBackup {
  vault?: CvFile;
  templates: Template[];
  jobs: Job[];
  candidates: Candidate[];
  applications: BackupApplication[];
}

/** What a restore did, to tell the user */
export interface RestoreSummary {
  vault: boolean;
  templates: number;
  jobs: number;
  candidates: number;
  applications: number;
  /** Records in the file that could not be read and were skipped */
  skipped: string[];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BYTE_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BYTE_CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Reads every record; a damaged one is left out and named in `problems` */
export async function buildBackup(
  storage: CvStorage,
  now: Date = new Date()
): Promise<{
  backup: FullBackup & { meta: ReturnType<typeof readExportMeta> };
  problems: string[];
}> {
  const problems: string[] = [];
  async function attempt<T>(label: string, read: () => Promise<T>) {
    try {
      return await read();
    } catch (error) {
      if (error instanceof StorageError && error.code === "not_found") {
        return undefined;
      }
      problems.push(
        `${label}: ${error instanceof Error ? error.message : error}`
      );
      return undefined;
    }
  }

  const vault = await attempt("vault", () => storage.loadVault());
  const templates: Template[] = [];
  for (const { id } of await storage.listTemplates()) {
    const item = await attempt(`template ${id}`, () =>
      storage.loadTemplate(id)
    );
    if (item) {
      templates.push(item);
    }
  }
  const jobs: Job[] = [];
  for (const { id } of await storage.listJobs()) {
    const item = await attempt(`job ${id}`, () => storage.loadJob(id));
    if (item) {
      jobs.push(item);
    }
  }
  const applications: BackupApplication[] = [];
  for (const { id } of await storage.listApplications()) {
    const application = await attempt(`application ${id}`, () =>
      storage.loadApplication(id)
    );
    if (!application) {
      continue;
    }
    const pdf = await attempt(`PDF of ${id}`, () =>
      storage.loadApplicationPdf(id)
    );
    applications.push({
      application,
      ...(pdf ? { pdf: bytesToBase64(pdf) } : {}),
    });
  }
  const candidates = await storage.listCandidates();

  const content: FullBackup = {
    ...(vault ? { vault } : {}),
    templates,
    jobs,
    candidates,
    applications,
  };
  return {
    backup: withExportMeta(content, "backup", CURRENT_BACKUP_VERSION, now),
    problems,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function listOf(raw: Record<string, unknown>, key: string): unknown[] {
  const value = raw[key];
  return Array.isArray(value) ? value : [];
}

/**
 * Writes a backup into `storage`. Records with the same id are replaced, others stay. Old
 * records are upgraded by the migration chains; a backup from a newer app, or a file that is
 * not a backup, is refused before anything is written. A damaged record is skipped and named.
 */
export async function restoreBackup(
  storage: CvStorage,
  raw: unknown
): Promise<RestoreSummary> {
  if (!isRecord(raw) || readExportMeta(raw)?.kind !== "backup") {
    throw new Error("This file is not a Squeezy CV backup.");
  }
  assertNotNewer(raw);

  const summary: RestoreSummary = {
    vault: false,
    templates: 0,
    jobs: 0,
    candidates: 0,
    applications: 0,
    skipped: [],
  };

  function upgraded<T extends object>(
    kind: ChainKind,
    item: unknown,
    guard: (value: unknown) => value is T
  ): T | undefined {
    try {
      const { file } = upgradeFile(item, kind);
      return guard(file) ? withoutExportMeta(file) : undefined;
    } catch {
      return undefined;
    }
  }

  // Check everything first, so a bad file changes nothing
  const vault = raw.vault === undefined ? undefined : migrateCvFile(raw.vault);
  const templates: Template[] = [];
  const jobs: Job[] = [];
  const candidates: Candidate[] = [];
  const applications: { application: Application; pdf?: Uint8Array }[] = [];
  function collect<T extends object>(
    key: string,
    kind: ChainKind,
    guard: (value: unknown) => value is T,
    into: T[]
  ): void {
    listOf(raw as Record<string, unknown>, key).forEach((item, index) => {
      const record = upgraded(kind, item, guard);
      if (record) {
        into.push(record);
      } else {
        summary.skipped.push(`${key} #${index + 1}`);
      }
    });
  }
  collect("templates", "template", TemplateSchema.guard, templates);
  collect("jobs", "job", JobSchema.guard, jobs);
  collect("candidates", "candidate", CandidateSchema.guard, candidates);
  listOf(raw, "applications").forEach((entry, index) => {
    const application = isRecord(entry)
      ? upgraded("application", entry.application, ApplicationSchema.guard)
      : undefined;
    if (!application || !isRecord(entry)) {
      summary.skipped.push(`applications #${index + 1}`);
      return;
    }
    try {
      applications.push({
        application,
        ...(typeof entry.pdf === "string"
          ? { pdf: base64ToBytes(entry.pdf) }
          : {}),
      });
    } catch {
      summary.skipped.push(`applications #${index + 1}`);
    }
  });

  if (vault) {
    await storage.saveVault(vault);
    summary.vault = true;
  }
  // Templates before jobs, as a job needs its template
  for (const template of templates) {
    await storage.saveTemplate(template);
    summary.templates += 1;
  }
  for (const job of jobs) {
    await storage.saveJob(job);
    summary.jobs += 1;
  }
  for (const candidate of candidates) {
    await storage.saveCandidate(candidate);
    summary.candidates += 1;
  }
  for (const { application, pdf } of applications) {
    await storage.saveApplication(application, pdf);
    summary.applications += 1;
  }
  return summary;
}
