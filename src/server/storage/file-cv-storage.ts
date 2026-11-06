import { promises as fs } from "node:fs";
import path from "node:path";
import {
  APPLICATION_ID_PATTERN,
  Application,
  ApplicationSchema,
  ApplicationSummary,
} from "@custom-types/application-types";
import { CvFile } from "@custom-types/vault-types";
import {
  Variant,
  VariantSchema,
  VARIANT_ID_PATTERN,
} from "@custom-types/variant-types";
import { summariseApplication } from "@shared/application/application-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  CvStorage,
  StorageError,
  VariantSummary,
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

function isReadableVariant(raw: unknown): boolean {
  return VariantSchema.guard(raw);
}

function isReadableApplication(raw: unknown): boolean {
  return ApplicationSchema.guard(raw);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Keeps everything as JSON files in one folder (`vault.json`, `variants/<id>.json` and `applications/<id>/application.json` + `cv.pdf`) */
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

  async listVariants(): Promise<VariantSummary[]> {
    const dir = path.join(this.dataDir, VARIANTS_DIR);
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const result: VariantSummary[] = [];
    for (const fileName of names.sort()) {
      if (!fileName.endsWith(".json")) {
        continue;
      }
      const id = fileName.slice(0, -".json".length);
      if (!VARIANT_ID_PATTERN.test(id)) {
        continue;
      }
      try {
        const variant = await this.loadVariant(id);
        result.push({ id, name: variant.name, isCorrupt: false });
      } catch {
        result.push({ id, name: "", isCorrupt: true });
      }
    }
    return result;
  }

  async loadVariant(id: string): Promise<Variant> {
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

  async saveVariant(variant: Variant): Promise<void> {
    const filePath = this.variantPath(variant.id);
    await this.queue.run(filePath, () =>
      writeJsonAtomic(filePath, variant, isReadableVariant)
    );
  }

  async deleteVariant(id: string): Promise<void> {
    const filePath = this.variantPath(id);
    await this.queue.run(filePath, async () => {
      if (!(await fileExists(filePath))) {
        throw new StorageError("not_found", `There is no variant ${id}.`);
      }
      // Keep a backup instead of destroying the data for good
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
      await fs.rm(`${dir}.deleted`, { recursive: true, force: true });
      await fs.rename(dir, `${dir}.deleted`);
    });
  }
}
