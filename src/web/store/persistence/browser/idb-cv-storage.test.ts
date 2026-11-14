import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import legacy from "@fixtures/legacy-cv-v0.json";
import sample from "@fixtures/sample-cv.json";
import { createApplication } from "@shared/application/application-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { StorageError } from "@shared/storage/cv-storage";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { KvStore, openKvStore } from "@store/persistence/browser/idb-kv";

const file = migrateCvFile(sample);
let counter = 0;
let kv: KvStore;
let storage: IdbCvStorage;

beforeEach(() => {
  counter += 1;
  kv = openKvStore(`test-db-${counter}`);
  storage = new IdbCvStorage(kv);
});

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  return error instanceof StorageError ? error.code : undefined;
}

const { template, job } = splitVariant(
  createVariant(file.vault, file.style, "j1", "Job one"),
  "t1",
  "2026-11-07"
);

describe("vault", () => {
  it("reports nothing saved yet", async () => {
    expect(await codeOf(storage.loadVault())).toBe("not_found");
  });

  it("round-trips and keeps the previous version as .bak", async () => {
    await storage.saveVault(file);
    expect((await storage.loadVault()).vault).toEqual(file.vault);
    expect(await kv.get("vault.json.bak")).toBeUndefined();
    await storage.saveVault(file);
    expect(await kv.get("vault.json.bak")).toBeDefined();
  });

  it("opens and upgrades an old file, keeping the old one as .bak", async () => {
    await kv.put("vault.json", legacy);
    const loaded = await storage.loadVault();
    expect(loaded.vault.version).toBeGreaterThan(0);
    expect(await kv.get("vault.json.bak")).toEqual(legacy);
    expect((await kv.get("vault.json")) as { meta?: unknown }).toHaveProperty(
      "meta"
    );
  });

  it("refuses an invalid vault on save and a damaged one on load", async () => {
    await expect(
      storage.saveVault({ vault: 5 } as never)
    ).rejects.toBeInstanceOf(StorageError);
    await kv.put("vault.json", { vault: "nonsense" });
    expect(await codeOf(storage.loadVault())).toBe("corrupt");
    expect(await kv.get("vault.json")).toEqual({ vault: "nonsense" });
  });
});

describe("templates and jobs", () => {
  it("saves, lists, loads and deletes with a copy kept", async () => {
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    expect(await storage.listTemplates()).toEqual([
      { id: "t1", name: template.name, isCorrupt: false },
    ]);
    expect((await storage.listJobs())[0]).toMatchObject({
      id: "j1",
      templateId: "t1",
    });
    expect((await storage.loadJob("j1")).name).toBe("Job one");
    await storage.deleteJob("j1");
    expect(await codeOf(storage.loadJob("j1"))).toBe("not_found");
    expect(await kv.get("jobs/j1.json.deleted")).toBeDefined();
    expect(await codeOf(storage.deleteJob("j1"))).toBe("not_found");
  });

  it("lists a damaged record as corrupt and rejects bad ids and records", async () => {
    await kv.put("templates/bad.json", { nope: true });
    expect(await storage.listTemplates()).toEqual([
      { id: "bad", name: "", isCorrupt: true },
    ]);
    expect(await codeOf(storage.loadTemplate("bad"))).toBe("corrupt");
    expect(await codeOf(storage.loadTemplate("../x"))).toBe("invalid_id");
    expect(await codeOf(storage.saveJob({ id: "j2" } as never))).toBe(
      "corrupt"
    );
  });

  it("keeps the previous version of a record", async () => {
    await storage.saveTemplate(template);
    await storage.saveTemplate({ ...template, name: "Renamed" });
    expect((await storage.loadTemplate("t1")).name).toBe("Renamed");
    expect(
      (await kv.get("templates/t1.json.bak")) as { name: string }
    ).toMatchObject({ name: template.name });
  });
});

describe("applications and candidates", () => {
  const application = createApplication(
    { company: "Acme", role: "Dev", withoutCv: true },
    undefined,
    undefined,
    "2026-11-07",
    "abcd"
  );

  it("stores an application with its PDF and deletes both", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2]);
    await storage.saveApplication(application, pdf);
    expect((await storage.listApplications()).map((a) => a.id)).toEqual([
      application.id,
    ]);
    expect((await storage.loadApplication(application.id)).company).toBe(
      "Acme"
    );
    expect(await storage.loadApplicationPdf(application.id)).toEqual(pdf);
    await storage.deleteApplication(application.id);
    expect(await storage.listApplications()).toEqual([]);
    expect(await codeOf(storage.loadApplicationPdf(application.id))).toBe(
      "not_found"
    );
  });

  it("has no PDF unless one was saved", async () => {
    await storage.saveApplication(application);
    expect(await codeOf(storage.loadApplicationPdf(application.id))).toBe(
      "not_found"
    );
  });

  it("skips a damaged candidate in the list", async () => {
    await kv.put("candidates/broken.json", { nope: 1 });
    expect(await storage.listCandidates()).toEqual([]);
    expect(await codeOf(storage.deleteCandidate("missing"))).toBe("not_found");
  });
});
