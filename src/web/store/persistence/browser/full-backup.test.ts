import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import legacy from "@fixtures/legacy-cv-v0.json";
import sample from "@fixtures/sample-cv.json";
import { buildBackup, restoreBackup } from "@shared/backup/full-backup";
import { createApplication } from "@shared/application/application-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { openKvStore } from "@store/persistence/browser/idb-kv";

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
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 255, 128]);

let counter = 0;
function freshStorage(): IdbCvStorage {
  counter += 1;
  return new IdbCvStorage(openKvStore(`backup-db-${counter}`));
}

let source: IdbCvStorage;
beforeEach(async () => {
  source = freshStorage();
  await source.saveVault(file);
  await source.saveTemplate(template);
  await source.saveJob(job);
  await source.saveApplication(application, PDF);
});

describe("full backup", () => {
  it("restores into an empty store with identical data", async () => {
    const { backup, problems } = await buildBackup(source);
    expect(problems).toEqual([]);
    // Through JSON, as a downloaded file would be
    const target = freshStorage();
    const summary = await restoreBackup(
      target,
      JSON.parse(JSON.stringify(backup))
    );
    expect(summary).toMatchObject({
      vault: true,
      templates: 1,
      jobs: 1,
      applications: 1,
    });
    expect(await target.loadVault()).toEqual(await source.loadVault());
    expect(await target.loadTemplate("t1")).toEqual(template);
    expect(await target.loadJob("j1")).toEqual(job);
    expect(await target.loadApplication(application.id)).toEqual(application);
    expect(await target.loadApplicationPdf(application.id)).toEqual(PDF);
  });

  it("holds only data: no settings and no keys", async () => {
    const { backup } = await buildBackup(source);
    expect(Object.keys(backup).sort()).toEqual([
      "applications",
      "candidates",
      "jobs",
      "meta",
      "templates",
      "vault",
    ]);
    expect(JSON.stringify(backup).toLowerCase()).not.toMatch(
      /api[_-]?key|token|secret/
    );
  });

  it("upgrades an old CV inside the backup", async () => {
    const { backup } = await buildBackup(source);
    const target = freshStorage();
    await restoreBackup(target, { ...backup, vault: legacy });
    expect((await target.loadVault()).vault.version).toBeGreaterThan(0);
  });

  it("refuses a backup from a newer app and a file that is not a backup, writing nothing", async () => {
    const { backup } = await buildBackup(source);
    const target = freshStorage();
    await expect(
      restoreBackup(target, {
        ...backup,
        meta: { ...backup.meta, appVersion: "99.0.0" },
      })
    ).rejects.toThrow(/newer|99\.0\.0/);
    await expect(restoreBackup(target, file)).rejects.toThrow(
      /not a CV Builder backup/
    );
    await expect(target.loadVault()).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("skips a damaged record and names it", async () => {
    const { backup } = await buildBackup(source);
    const target = freshStorage();
    const summary = await restoreBackup(target, {
      ...backup,
      jobs: [{ nope: true }, ...backup.jobs],
    });
    expect(summary.jobs).toBe(1);
    expect(summary.skipped).toEqual(["jobs #1"]);
  });
});
