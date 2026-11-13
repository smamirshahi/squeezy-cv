import {
  APPLICATION_ID_PATTERN,
  Application,
  ApplicationSchema,
  ApplicationSummary,
} from "@custom-types/application-types";
import {
  CANDIDATE_ID_PATTERN,
  Candidate,
  CandidateSchema,
} from "@custom-types/candidate-types";
import { CURRENT_VAULT_VERSION, CvFile } from "@custom-types/vault-types";
import { Job, JobSchema, JOB_ID_PATTERN } from "@custom-types/job-types";
import {
  Template,
  TemplateSchema,
  TEMPLATE_ID_PATTERN,
} from "@custom-types/template-types";
import { summariseApplication } from "@shared/application/application-utils";
import {
  withExportMeta,
  withoutExportMeta,
} from "@shared/migration/export-meta";
import { ChainKind, upgradeFile } from "@shared/migration/migration-chains";
import {
  CvStorage,
  JobSummary,
  StorageError,
  TemplateSummary,
} from "@shared/storage/cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { KvStore } from "@store/persistence/browser/idb-kv";

const VAULT_KEY = "vault.json";
const TEMPLATES = "templates/";
const JOBS = "jobs/";
const CANDIDATES = "candidates/";
const APPLICATIONS = "applications/";
const APPLICATION_FILE = "application.json";
const APPLICATION_PDF = "cv.pdf";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function storedVaultFormat(raw: unknown): number {
  const vault = (raw as { vault?: { version?: unknown } } | null)?.vault;
  return typeof vault?.version === "number" ? vault.version : 0;
}

function checkId(label: string, pattern: RegExp, id: string): void {
  if (!pattern.test(id)) {
    throw new StorageError(
      "invalid_id",
      `${label} id may only contain letters, digits, - and _ (at most 64).`
    );
  }
}

/**
 * Browser mode: the same data as the `data/` folder, in IndexedDB. Keys are the file paths
 * (`vault.json`, `templates/<id>.json`, `jobs/<id>.json`, `candidates/<id>.json`,
 * `applications/<id>/application.json` and `cv.pdf`). Every save keeps the previous version
 * at `<key>.bak` and every delete keeps a copy at `<key>.deleted`, like the file storage.
 * Reads validate against the shared schemas and run the migration chains.
 */
export class IdbCvStorage implements CvStorage {
  constructor(private readonly kv: KvStore) {}

  /** The ids of the records saved as `<dir><id>.json` */
  private async idsIn(dir: string, pattern: RegExp): Promise<string[]> {
    const ids: string[] = [];
    for (const key of await this.kv.keys(dir)) {
      const match = /^[^/]+\/([^/]+)\.json$/.exec(key);
      if (match && pattern.test(match[1])) {
        ids.push(match[1]);
      }
    }
    return ids;
  }

  /** Reads a stored record; a value that is not an object counts as damaged */
  private async read(key: string, label: string): Promise<unknown> {
    const raw = await this.kv.get(key);
    if (raw !== undefined && (typeof raw !== "object" || raw === null)) {
      throw new StorageError(
        "corrupt",
        `${label} cannot be read. It was left untouched.`
      );
    }
    return raw;
  }

  /** Upgrades an old record and writes it back (the old one stays as `.bak`) */
  private async upgrade(
    kind: ChainKind,
    raw: unknown,
    key: string,
    label: string
  ): Promise<unknown> {
    let result: ReturnType<typeof upgradeFile>;
    try {
      result = upgradeFile(raw, kind);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `${label} cannot be opened: ${describe(error)} It was left untouched.`
      );
    }
    if (result.notice) {
      try {
        await this.kv.putKeepingPrevious(
          key,
          withExportMeta(result.file as object, kind, result.notice.toFormat)
        );
      } catch {
        // The upgraded copy is still returned; saving is tried again on the next change
      }
    }
    return result.file;
  }

  private async loadRecord<T extends { id: string }>(
    kind: ChainKind,
    key: string,
    id: string,
    label: string,
    guard: (value: unknown) => value is T
  ): Promise<T> {
    const raw = await this.read(key, label);
    if (raw === undefined) {
      throw new StorageError("not_found", `There is no ${label}.`);
    }
    const upgraded = await this.upgrade(kind, raw, key, label);
    if (!guard(upgraded) || upgraded.id !== id) {
      throw new StorageError(
        "corrupt",
        `${label} is not valid. It was left untouched.`
      );
    }
    return withoutExportMeta(upgraded);
  }

  private async saveRecord(
    kind: ChainKind,
    key: string,
    record: { version: number },
    isValid: boolean
  ): Promise<void> {
    if (!isValid) {
      throw new StorageError("corrupt", "That record is not valid.");
    }
    await this.kv.putKeepingPrevious(
      key,
      withExportMeta(record, kind, record.version)
    );
  }

  private async deleteRecord(key: string, label: string): Promise<void> {
    if (!(await this.kv.deleteKeepingCopy(key))) {
      throw new StorageError("not_found", `There is no ${label}.`);
    }
  }

  async loadVault(): Promise<CvFile> {
    const raw = await this.read(VAULT_KEY, "The CV");
    if (raw === undefined) {
      throw new StorageError("not_found", "No CV has been saved yet.");
    }
    try {
      const file = withoutExportMeta(migrateCvFile(raw));
      if (storedVaultFormat(raw) < CURRENT_VAULT_VERSION) {
        try {
          await this.kv.putKeepingPrevious(
            VAULT_KEY,
            withExportMeta(file, "vault", file.vault.version)
          );
        } catch {
          // The upgraded copy is still returned; saving is tried again on the next change
        }
      }
      return file;
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `The CV is not a valid CV file: ${describe(error)}. It was left untouched.`
      );
    }
  }

  async saveVault(file: CvFile): Promise<void> {
    try {
      migrateCvFile(file);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `The CV is not valid: ${describe(error)}`
      );
    }
    await this.kv.putKeepingPrevious(
      VAULT_KEY,
      withExportMeta(file, "vault", file.vault.version)
    );
  }

  async listTemplates(): Promise<TemplateSummary[]> {
    const result: TemplateSummary[] = [];
    for (const id of await this.idsIn(TEMPLATES, TEMPLATE_ID_PATTERN)) {
      try {
        result.push({
          id,
          name: (await this.loadTemplate(id)).name,
          isCorrupt: false,
        });
      } catch {
        result.push({ id, name: "", isCorrupt: true });
      }
    }
    return result;
  }

  async loadTemplate(id: string): Promise<Template> {
    checkId("A template", TEMPLATE_ID_PATTERN, id);
    return this.loadRecord(
      "template",
      `${TEMPLATES}${id}.json`,
      id,
      `template ${id}`,
      TemplateSchema.guard
    );
  }

  async saveTemplate(template: Template): Promise<void> {
    checkId("A template", TEMPLATE_ID_PATTERN, template.id);
    await this.saveRecord(
      "template",
      `${TEMPLATES}${template.id}.json`,
      template,
      TemplateSchema.guard(template)
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    checkId("A template", TEMPLATE_ID_PATTERN, id);
    await this.deleteRecord(`${TEMPLATES}${id}.json`, `template ${id}`);
  }

  private summariseJob(job: Job): JobSummary {
    return {
      id: job.id,
      name: job.name,
      templateId: job.templateId,
      ...(job.company ? { company: job.company } : {}),
      ...(job.role ? { role: job.role } : {}),
      ...(job.stage ? { stage: job.stage } : {}),
      createdAt: job.createdAt,
      isCorrupt: false,
    };
  }

  async listJobs(): Promise<JobSummary[]> {
    const result: JobSummary[] = [];
    for (const id of await this.idsIn(JOBS, JOB_ID_PATTERN)) {
      try {
        result.push(this.summariseJob(await this.loadJob(id)));
      } catch {
        result.push({
          id,
          name: "",
          templateId: "",
          createdAt: "",
          isCorrupt: true,
        });
      }
    }
    return result;
  }

  async loadJob(id: string): Promise<Job> {
    checkId("A job", JOB_ID_PATTERN, id);
    return this.loadRecord(
      "job",
      `${JOBS}${id}.json`,
      id,
      `job ${id}`,
      JobSchema.guard
    );
  }

  async saveJob(job: Job): Promise<void> {
    checkId("A job", JOB_ID_PATTERN, job.id);
    await this.saveRecord(
      "job",
      `${JOBS}${job.id}.json`,
      job,
      JobSchema.guard(job)
    );
  }

  async deleteJob(id: string): Promise<void> {
    checkId("A job", JOB_ID_PATTERN, id);
    await this.deleteRecord(`${JOBS}${id}.json`, `job ${id}`);
  }

  async listApplications(): Promise<ApplicationSummary[]> {
    const ids = new Set<string>();
    for (const key of await this.kv.keys(APPLICATIONS)) {
      const match = /^applications\/([^/]+)\/application\.json$/.exec(key);
      if (match && APPLICATION_ID_PATTERN.test(match[1])) {
        ids.add(match[1]);
      }
    }
    const result: ApplicationSummary[] = [];
    for (const id of [...ids].sort()) {
      try {
        result.push(summariseApplication(await this.loadApplication(id)));
      } catch (error) {
        if (error instanceof StorageError && error.code === "not_found") {
          continue;
        }
        result.push({
          id,
          company: "",
          role: "",
          status: "applied",
          appliedAt: "",
          jobId: "",
          templateId: "",
          jobName: "",
          templateName: "",
          updatedAt: "",
          isCorrupt: true,
        });
      }
    }
    return result;
  }

  private applicationKey(id: string, file: string): string {
    checkId("An application", APPLICATION_ID_PATTERN, id);
    return `${APPLICATIONS}${id}/${file}`;
  }

  async loadApplication(id: string): Promise<Application> {
    return this.loadRecord(
      "application",
      this.applicationKey(id, APPLICATION_FILE),
      id,
      `application ${id}`,
      ApplicationSchema.guard
    );
  }

  async loadApplicationPdf(id: string): Promise<Uint8Array> {
    const bytes = await this.kv.get(this.applicationKey(id, APPLICATION_PDF));
    if (!(bytes instanceof Uint8Array)) {
      throw new StorageError(
        "not_found",
        `Application ${id} has no saved PDF.`
      );
    }
    return bytes;
  }

  async saveApplication(
    application: Application,
    pdf?: Uint8Array
  ): Promise<void> {
    // PDF first: a readable application record always has its PDF next to it
    if (pdf) {
      await this.kv.put(
        this.applicationKey(application.id, APPLICATION_PDF),
        pdf
      );
    }
    await this.saveRecord(
      "application",
      this.applicationKey(application.id, APPLICATION_FILE),
      application,
      ApplicationSchema.guard(application)
    );
  }

  async deleteApplication(id: string): Promise<void> {
    await this.deleteRecord(
      this.applicationKey(id, APPLICATION_FILE),
      `application ${id}`
    );
    await this.kv.deleteKeepingCopy(this.applicationKey(id, APPLICATION_PDF));
  }

  async listCandidates(): Promise<Candidate[]> {
    const result: Candidate[] = [];
    for (const id of await this.idsIn(CANDIDATES, CANDIDATE_ID_PATTERN)) {
      try {
        result.push(await this.loadCandidate(id));
      } catch (error) {
        if (error instanceof StorageError) {
          continue;
        }
        throw error;
      }
    }
    return result;
  }

  async loadCandidate(id: string): Promise<Candidate> {
    checkId("A candidate", CANDIDATE_ID_PATTERN, id);
    return this.loadRecord(
      "candidate",
      `${CANDIDATES}${id}.json`,
      id,
      `candidate ${id}`,
      CandidateSchema.guard
    );
  }

  async saveCandidate(candidate: Candidate): Promise<void> {
    checkId("A candidate", CANDIDATE_ID_PATTERN, candidate.id);
    await this.saveRecord(
      "candidate",
      `${CANDIDATES}${candidate.id}.json`,
      candidate,
      CandidateSchema.guard(candidate)
    );
  }

  async deleteCandidate(id: string): Promise<void> {
    checkId("A candidate", CANDIDATE_ID_PATTERN, id);
    await this.deleteRecord(`${CANDIDATES}${id}.json`, `candidate ${id}`);
  }
}
