import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import legacy from "@fixtures/legacy-cv-v0.json";
import sample from "@fixtures/sample-cv.json";
import { createApplication } from "@shared/application/application-utils";
import { StorageError } from "@shared/storage/cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { FakeFolder } from "@store/persistence/browser/fake-folder";
import { openFolderKvStore } from "@store/persistence/browser/folder-kv";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";

const file = migrateCvFile(sample);
const { template, job } = splitVariant(
  createVariant(file.vault, file.style, "j1", "Job one"),
  "t1",
  "2026-11-07"
);
const application = createApplication(
  { company: "Acme", role: "Dev", withoutCv: true },
  undefined,
  undefined,
  "2026-11-07",
  "abcd"
);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);

let folder: FakeFolder;
let storage: IdbCvStorage;

beforeEach(() => {
  folder = new FakeFolder();
  storage = new IdbCvStorage(openFolderKvStore(folder.asHandle()));
});

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  return error instanceof StorageError ? error.code : undefined;
}

describe("the CV storage on a folder", () => {
  it("saves everything as files with the server's names", async () => {
    await storage.saveVault(file);
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    await storage.saveApplication(application, PDF);
    expect(await folder.paths()).toEqual([
      `applications/${application.id}/application.json`,
      `applications/${application.id}/cv.pdf`,
      "jobs/j1.json",
      "templates/t1.json",
      "vault.json",
    ]);
  });

  it("writes the meta block into every file", async () => {
    await storage.saveVault(file);
    await storage.saveJob(job);
    const vault = JSON.parse((await folder.read("vault.json")) ?? "") as {
      meta: { kind: string; appVersion: string };
    };
    expect(vault.meta.kind).toBe("vault");
    expect(vault.meta.appVersion).toBeTruthy();
    const saved = JSON.parse((await folder.read("jobs/j1.json")) ?? "") as {
      meta: { kind: string };
    };
    expect(saved.meta.kind).toBe("job");
  });

  it("round-trips the vault, templates, jobs, applications and their PDF", async () => {
    await storage.saveVault(file);
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    await storage.saveApplication(application, PDF);
    expect((await storage.loadVault()).vault).toEqual(file.vault);
    expect((await storage.loadTemplate("t1")).name).toBe(template.name);
    expect((await storage.loadJob("j1")).name).toBe("Job one");
    expect((await storage.listApplications()).map((a) => a.id)).toEqual([
      application.id,
    ]);
    expect(
      Array.from(await storage.loadApplicationPdf(application.id))
    ).toEqual(Array.from(PDF));
  });

  it("keeps the previous version as .bak next to the file", async () => {
    await storage.saveTemplate(template);
    await storage.saveTemplate({ ...template, name: "Renamed" });
    expect(await folder.paths()).toContain("templates/t1.json.bak");
    const previous = JSON.parse(
      (await folder.read("templates/t1.json.bak")) ?? ""
    ) as { name: string };
    expect(previous.name).toBe(template.name);
    // The copy is not mistaken for a template of its own
    expect((await storage.listTemplates()).map((t) => t.id)).toEqual(["t1"]);
  });

  it("keeps a deleted job as .deleted and stops listing it", async () => {
    await storage.saveJob(job);
    await storage.deleteJob("j1");
    expect(await folder.paths()).toEqual(["jobs/j1.json.deleted"]);
    expect(await storage.listJobs()).toEqual([]);
    expect(await codeOf(storage.loadJob("j1"))).toBe("not_found");
  });

  it("opens an old vault file, upgrades it and keeps the old one as .bak", async () => {
    await folder.write("vault.json", JSON.stringify(legacy));
    const loaded = await storage.loadVault();
    expect(loaded.vault.version).toBeGreaterThan(0);
    expect(JSON.parse((await folder.read("vault.json.bak")) ?? "")).toEqual(
      legacy
    );
    expect(JSON.parse((await folder.read("vault.json")) ?? "")).toHaveProperty(
      "meta"
    );
  });

  it("says a file is damaged and leaves it untouched", async () => {
    await folder.write("vault.json", "{ half a file");
    expect(await codeOf(storage.loadVault())).toBe("corrupt");
    expect(await folder.read("vault.json")).toBe("{ half a file");
    await folder.write("jobs/bad.json", '{"nope":true}');
    expect(await storage.listJobs()).toMatchObject([
      { id: "bad", isCorrupt: true },
    ]);
  });

  it("says nothing was saved yet for an empty folder", async () => {
    expect(await codeOf(storage.loadVault())).toBe("not_found");
    expect(await storage.listJobs()).toEqual([]);
    expect(await storage.listApplications()).toEqual([]);
  });
});

describe("a folder shared with server mode", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "folder-compat-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function copyDiskToFolder(from: string, to = ""): Promise<void> {
    for (const entry of await readdir(from, { withFileTypes: true })) {
      const full = path.join(from, entry.name);
      if (entry.isDirectory()) {
        await copyDiskToFolder(full, `${to}${entry.name}/`);
      } else {
        await folder.write(`${to}${entry.name}`, await readFile(full));
      }
    }
  }

  async function copyFolderToDisk(): Promise<void> {
    for (const name of await folder.paths()) {
      const target = path.join(dir, name);
      await mkdir(path.dirname(target), { recursive: true });
      const text = await folder.read(name);
      await writeFile(target, text ?? "");
    }
  }

  it("lets the browser open what the server saved", async () => {
    const server = new FileCvStorage(dir);
    await server.saveVault(file);
    await server.saveTemplate(template);
    await server.saveJob(job);
    await server.saveApplication(application, Buffer.from(PDF));
    await copyDiskToFolder(dir);

    expect((await storage.loadVault()).vault).toEqual(file.vault);
    expect((await storage.loadTemplate("t1")).id).toBe("t1");
    expect((await storage.loadJob("j1")).templateId).toBe("t1");
    expect((await storage.listApplications()).map((a) => a.id)).toEqual([
      application.id,
    ]);
    expect(
      Array.from(await storage.loadApplicationPdf(application.id))
    ).toEqual(Array.from(PDF));
  });

  it("lets the server open what the browser saved", async () => {
    await storage.saveVault(file);
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    await storage.saveApplication(application, PDF);
    await copyFolderToDisk();

    const server = new FileCvStorage(dir);
    expect((await server.loadVault()).vault).toEqual(file.vault);
    expect((await server.loadTemplate("t1")).id).toBe("t1");
    expect((await server.loadJob("j1")).id).toBe("j1");
    expect((await server.listApplications()).map((a) => a.id)).toEqual([
      application.id,
    ]);
  });
});
