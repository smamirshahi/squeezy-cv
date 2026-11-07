import { promises as fs } from "node:fs";
import path from "node:path";
import {
  APPLICATION_ID_PATTERN,
  Application,
  ApplicationSchema,
  ApplicationSummary,
} from "@custom-types/application-types";
import { CvFile } from "@custom-types/vault-types";
import { Job, JobSchema, JOB_ID_PATTERN } from "@custom-types/job-types";
import {
  Template,
  TemplateSchema,
  TEMPLATE_ID_PATTERN,
} from "@custom-types/template-types";
import {
  Variant,
  VariantSchema,
  VARIANT_ID_PATTERN,
} from "@custom-types/variant-types";
import { summariseApplication } from "@shared/application/application-utils";
import { splitVariant } from "@shared/variant/template-job";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  CvStorage,
  JobSummary,
  StorageError,
  TemplateSummary,
} from "@server/storage/cv-storage";
import {
  KeyedQueue,
  fileExists,
  readJsonFile,
  writeBytesAtomic,
  writeJsonAtomic,
} from "@server/storage/file-utils";

const VAULT_FILE = "vault.json";
const VARIANTS_DIR = "variants";
const TEMPLATES_DIR = "templates";
const JOBS_DIR = "jobs";
const LEGACY_TEMPLATE_PREFIX = "template-";
const APPLICATIONS_DIR = "applications";
const APPLICATION_FILE = "application.json";
const APPLICATION_PDF = "cv.pdf";

function isReadableVault(raw: unknown): boolean {
  try {
    migrateCvFile(raw);
    return true;
  } catch {
    return false;
  }
}

function isReadableTemplate(raw: unknown): boolean {
  return TemplateSchema.guard(raw);
}

function isReadableJob(raw: unknown): boolean {
  return JobSchema.guard(raw);
}

/** Id of the template made from the legacy variant `variantId` (at most 64 characters) */
function legacyTemplateId(variantId: string): string {
  return `${LEGACY_TEMPLATE_PREFIX}${variantId}`.slice(0, 64);
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function isReadableApplication(raw: unknown): boolean {
  return ApplicationSchema.guard(raw);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Keeps everything as JSON files in one folder: `vault.json`, `templates/`, `jobs/`, `applications/<id>/` (and old `variants/`, read-only) */
export class FileCvStorage implements CvStorage {
  private readonly queue = new KeyedQueue();

  constructor(private readonly dataDir: string) {}

  private vaultPath(): string {
    return path.join(this.dataDir, VAULT_FILE);
  }

  private variantPath(id: string): string {
    if (!VARIANT_ID_PATTERN.test(id)) {
      throw new StorageError(
        "invalid_id",
        "A variant id may only contain letters, digits, - and _ (at most 64)."
      );
    }
    return path.join(this.dataDir, VARIANTS_DIR, `${id}.json`);
  }

  async loadVault(): Promise<CvFile> {
    const filePath = this.vaultPath();
    let raw: unknown;
    try {
      raw = await readJsonFile(filePath);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `${VAULT_FILE} cannot be read: ${describe(error)}. The file was left untouched.`
      );
    }
    if (raw === undefined) {
      throw new StorageError("not_found", "No CV has been saved yet.");
    }
    try {
      return migrateCvFile(raw);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `${VAULT_FILE} is not a valid CV file: ${describe(error)}. The file was left untouched.`
      );
    }
  }

  async saveVault(file: CvFile): Promise<void> {
    const filePath = this.vaultPath();
    await this.queue.run(filePath, () =>
      writeJsonAtomic(filePath, file, isReadableVault)
    );
  }

  /** Reads an old `variants/<id>.json` (only used to split it into a template and a job) */
  private async loadVariant(id: string): Promise<Variant> {
    const filePath = this.variantPath(id);
    let raw: unknown;
    try {
      raw = await readJsonFile(filePath);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `Variant ${id} cannot be read: ${describe(error)}. The file was left untouched.`
      );
    }
    if (raw === undefined) {
      throw new StorageError("not_found", `There is no variant ${id}.`);
    }
    if (!VariantSchema.guard(raw) || raw.id !== id) {
      throw new StorageError(
        "corrupt",
        `Variant ${id} is not a valid variant file. The file was left untouched.`
      );
    }
    return raw;
  }

  private templatePath(id: string): string {
    if (!TEMPLATE_ID_PATTERN.test(id)) {
      throw new StorageError(
        "invalid_id",
        "A template id may only contain letters, digits, - and _ (at most 64)."
      );
    }
    return path.join(this.dataDir, TEMPLATES_DIR, `${id}.json`);
  }

  private jobPath(id: string): string {
    if (!JOB_ID_PATTERN.test(id)) {
      throw new StorageError(
        "invalid_id",
        "A job id may only contain letters, digits, - and _ (at most 64)."
      );
    }
    return path.join(this.dataDir, JOBS_DIR, `${id}.json`);
  }

  /** Ids of the `*.json` files in a folder that are valid ids, sorted; empty if no folder */
  private async idsIn(dirName: string, pattern: RegExp): Promise<string[]> {
    let names: string[];
    try {
      names = await fs.readdir(path.join(this.dataDir, dirName));
    } catch (error) {
      if (isMissing(error)) {
        return [];
      }
      throw error;
    }
    return names
      .sort()
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length))
      .filter((id) => pattern.test(id));
  }

  private async hasEntries(dirName: string): Promise<boolean> {
    try {
      return (await fs.readdir(path.join(this.dataDir, dirName))).length > 0;
    } catch (error) {
      if (isMissing(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Old data: variant files and no job files yet. Each readable variant is split into a
   * template and a job; a damaged variant is skipped and left untouched.
   */
  private async legacyPairs(): Promise<{ template: Template; job: Job }[]> {
    // Once either folder has anything (even a `.deleted` copy), the new files are the truth
    if (
      (await this.hasEntries(JOBS_DIR)) ||
      (await this.hasEntries(TEMPLATES_DIR))
    ) {
      return [];
    }
    const pairs: { template: Template; job: Job }[] = [];
    for (const id of await this.idsIn(VARIANTS_DIR, VARIANT_ID_PATTERN)) {
      try {
        const variant = await this.loadVariant(id);
        const stat = await fs.stat(this.variantPath(id));
        pairs.push(
          splitVariant(
            variant,
            legacyTemplateId(id),
            stat.mtime.toISOString().slice(0, 10)
          )
        );
      } catch {
        continue;
      }
    }
    return pairs;
  }

  /** Writes the legacy templates and jobs as real files, so they stay once a job exists */
  private async materialiseLegacy(): Promise<void> {
    for (const { template, job } of await this.legacyPairs()) {
      const templatePath = this.templatePath(template.id);
      await this.queue.run(templatePath, () =>
        writeJsonAtomic(templatePath, template, isReadableTemplate)
      );
      const jobPath = this.jobPath(job.id);
      await this.queue.run(jobPath, () =>
        writeJsonAtomic(jobPath, job, isReadableJob)
      );
    }
  }

  async listTemplates(): Promise<TemplateSummary[]> {
    const legacy = await this.legacyPairs();
    if (legacy.length > 0) {
      return legacy.map(({ template }) => ({
        id: template.id,
        name: template.name,
        isCorrupt: false,
      }));
    }
    const result: TemplateSummary[] = [];
    for (const id of await this.idsIn(TEMPLATES_DIR, TEMPLATE_ID_PATTERN)) {
      try {
        const template = await this.loadTemplate(id);
        result.push({ id, name: template.name, isCorrupt: false });
      } catch {
        result.push({ id, name: "", isCorrupt: true });
      }
    }
    return result;
  }

  async loadTemplate(id: string): Promise<Template> {
    const filePath = this.templatePath(id);
    let raw: unknown;
    try {
      raw = await readJsonFile(filePath);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `Template ${id} cannot be read: ${describe(error)}. The file was left untouched.`
      );
    }
    if (raw === undefined) {
      const legacy = (await this.legacyPairs()).find(
        (pair) => pair.template.id === id
      );
      if (legacy) {
        return legacy.template;
      }
      throw new StorageError("not_found", `There is no template ${id}.`);
    }
    if (!TemplateSchema.guard(raw) || raw.id !== id) {
      throw new StorageError(
        "corrupt",
        `Template ${id} is not a valid template file. The file was left untouched.`
      );
    }
    return raw;
  }

  async saveTemplate(template: Template): Promise<void> {
    const filePath = this.templatePath(template.id);
    await this.materialiseLegacy();
    await this.queue.run(filePath, () =>
      writeJsonAtomic(filePath, template, isReadableTemplate)
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    const filePath = this.templatePath(id);
    await this.materialiseLegacy();
    await this.queue.run(filePath, async () => {
      if (!(await fileExists(filePath))) {
        throw new StorageError("not_found", `There is no template ${id}.`);
      }
      await fs.copyFile(filePath, `${filePath}.deleted`);
      await fs.rm(filePath);
    });
  }

  async listJobs(): Promise<JobSummary[]> {
    const legacy = await this.legacyPairs();
    if (legacy.length > 0) {
      return legacy.map(({ job }) => this.summariseJob(job));
    }
    const result: JobSummary[] = [];
    for (const id of await this.idsIn(JOBS_DIR, JOB_ID_PATTERN)) {
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

  private summariseJob(job: Job): JobSummary {
    return {
      id: job.id,
      name: job.name,
      templateId: job.templateId,
      ...(job.company === undefined ? {} : { company: job.company }),
      ...(job.role === undefined ? {} : { role: job.role }),
      createdAt: job.createdAt,
      isCorrupt: false,
    };
  }

  async loadJob(id: string): Promise<Job> {
    const filePath = this.jobPath(id);
    let raw: unknown;
    try {
      raw = await readJsonFile(filePath);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `Job ${id} cannot be read: ${describe(error)}. The file was left untouched.`
      );
    }
    if (raw === undefined) {
      const legacy = (await this.legacyPairs()).find(
        (pair) => pair.job.id === id
      );
      if (legacy) {
        return legacy.job;
      }
      throw new StorageError("not_found", `There is no job ${id}.`);
    }
    if (!JobSchema.guard(raw) || raw.id !== id) {
      throw new StorageError(
        "corrupt",
        `Job ${id} is not a valid job file. The file was left untouched.`
      );
    }
    return raw;
  }

  async saveJob(job: Job): Promise<void> {
    const filePath = this.jobPath(job.id);
    await this.materialiseLegacy();
    await this.queue.run(filePath, () =>
      writeJsonAtomic(filePath, job, isReadableJob)
    );
  }

  async deleteJob(id: string): Promise<void> {
    const filePath = this.jobPath(id);
    await this.materialiseLegacy();
    await this.queue.run(filePath, async () => {
      if (!(await fileExists(filePath))) {
        throw new StorageError("not_found", `There is no job ${id}.`);
      }
      await fs.copyFile(filePath, `${filePath}.deleted`);
      await fs.rm(filePath);
    });
  }

  private applicationDir(id: string): string {
    if (!APPLICATION_ID_PATTERN.test(id)) {
      throw new StorageError(
        "invalid_id",
        "An application id may only contain letters, digits, - and _ (at most 64)."
      );
    }
    return path.join(this.dataDir, APPLICATIONS_DIR, id);
  }

  async listApplications(): Promise<ApplicationSummary[]> {
    const dir = path.join(this.dataDir, APPLICATIONS_DIR);
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const result: ApplicationSummary[] = [];
    // Names with a dot (e.g. "<id>.deleted") are not applications
    for (const id of names.sort()) {
      if (!APPLICATION_ID_PATTERN.test(id)) {
        continue;
      }
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

  async loadApplication(id: string): Promise<Application> {
    const filePath = path.join(this.applicationDir(id), APPLICATION_FILE);
    let raw: unknown;
    try {
      raw = await readJsonFile(filePath);
    } catch (error) {
      throw new StorageError(
        "corrupt",
        `Application ${id} cannot be read: ${describe(error)}. The file was left untouched.`
      );
    }
    if (raw === undefined) {
      throw new StorageError("not_found", `There is no application ${id}.`);
    }
    if (!ApplicationSchema.guard(raw) || raw.id !== id) {
      throw new StorageError(
        "corrupt",
        `Application ${id} is not a valid application file. The file was left untouched.`
      );
    }
    return raw;
  }

  async loadApplicationPdf(id: string): Promise<Buffer> {
    const filePath = path.join(this.applicationDir(id), APPLICATION_PDF);
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageError(
          "not_found",
          `Application ${id} has no saved PDF.`
        );
      }
      throw error;
    }
  }

  async saveApplication(application: Application, pdf?: Buffer): Promise<void> {
    const dir = this.applicationDir(application.id);
    const filePath = path.join(dir, APPLICATION_FILE);
    await this.queue.run(dir, async () => {
      // PDF first: a readable application file always has its PDF next to it
      if (pdf) {
        await writeBytesAtomic(path.join(dir, APPLICATION_PDF), pdf);
      }
      await writeJsonAtomic(filePath, application, isReadableApplication);
    });
  }

  async deleteApplication(id: string): Promise<void> {
    const dir = this.applicationDir(id);
    await this.queue.run(dir, async () => {
      if (!(await fileExists(dir))) {
        throw new StorageError("not_found", `There is no application ${id}.`);
      }
      // Keep it aside instead of destroying it for good (git history has it too)
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Node option names
      await fs.rm(`${dir}.deleted`, { recursive: true, force: true });
      await fs.rename(dir, `${dir}.deleted`);
    });
  }
}
