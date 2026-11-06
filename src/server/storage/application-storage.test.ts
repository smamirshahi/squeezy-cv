import { Application } from "@custom-types/application-types";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { createApplication } from "@shared/application/application-utils";
import { createVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { StorageError } from "@server/storage/cv-storage";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const file = migrateCvFile(sample);
const variant = createVariant(file.vault, file.style, "v1", "Acme");

function make(company: string, suffix: string): Application {
  return createApplication(
    { variantId: "v1", company, role: "Dev" },
    file.vault,
    variant,
    "2026-11-06",
    suffix
  );
}

const PDF = Buffer.from("%PDF-1.7 fake");

let dir: string;
let storage: FileCvStorage;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-applications-"));
  storage = new FileCvStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof StorageError ? error.code : "other";
  }
  return "none";
}

describe("applications on disk", () => {
  it("lists nothing at first", async () => {
    expect(await storage.listApplications()).toEqual([]);
  });

  it("saves the application and its PDF in one folder, and reads them back", async () => {
    const application = make("Acme", "aaaa");
    await storage.saveApplication(application, PDF);
    expect(
      await readdir(path.join(dir, "applications", application.id))
    ).toEqual(expect.arrayContaining(["application.json", "cv.pdf"]));
    expect(await storage.loadApplication(application.id)).toEqual(application);
    expect(await storage.loadApplicationPdf(application.id)).toEqual(PDF);
    expect(await storage.listApplications()).toEqual([
      expect.objectContaining({
        id: application.id,
        company: "Acme",
        status: "applied",
        appliedAt: "2026-11-06",
        isCorrupt: false,
      }),
    ]);
  });

  it("keeps the PDF when only the application is edited", async () => {
    const application = make("Acme", "aaaa");
    await storage.saveApplication(application, PDF);
    await storage.saveApplication({ ...application, notes: "called" });
    expect((await storage.loadApplication(application.id)).notes).toBe(
      "called"
    );
    expect(await storage.loadApplicationPdf(application.id)).toEqual(PDF);
  });

  it("reports unknown and invalid ids", async () => {
    expect(await codeOf(storage.loadApplication("nope"))).toBe("not_found");
    expect(await codeOf(storage.loadApplicationPdf("nope"))).toBe("not_found");
    expect(await codeOf(storage.deleteApplication("nope"))).toBe("not_found");
    expect(await codeOf(storage.loadApplication("../vault"))).toBe(
      "invalid_id"
    );
    expect(await codeOf(storage.deleteApplication("a/b"))).toBe("invalid_id");
  });

  it("reports a damaged application and never treats it as empty", async () => {
    const good = make("Acme", "aaaa");
    await storage.saveApplication(good, PDF);
    const badDir = path.join(dir, "applications", "broken");
    await mkdir(badDir, { recursive: true });
    await writeFile(path.join(badDir, "application.json"), "{ not json");

    expect(await codeOf(storage.loadApplication("broken"))).toBe("corrupt");
    const list = await storage.listApplications();
    expect(list.map((entry) => [entry.id, entry.isCorrupt])).toEqual([
      ["2026-11-06-acme-dev-aaaa", false],
      ["broken", true],
    ]);
    expect(await readFile(path.join(badDir, "application.json"), "utf8")).toBe(
      "{ not json"
    );
  });

  it("moves a deleted application aside instead of destroying it", async () => {
    const application = make("Acme", "aaaa");
    await storage.saveApplication(application, PDF);
    await storage.deleteApplication(application.id);
    expect(await storage.listApplications()).toEqual([]);
    expect(await codeOf(storage.loadApplication(application.id))).toBe(
      "not_found"
    );
    expect(await readdir(path.join(dir, "applications"))).toEqual([
      `${application.id}.deleted`,
    ]);
  });
});
