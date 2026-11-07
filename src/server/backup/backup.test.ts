import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { buildServer } from "@server/app";
import { BackupService } from "@server/backup/backup-service";
import { DataRepo, GitDataRepo } from "@server/backup/data-repo";
import { VersionedCvStorage } from "@server/backup/versioned-storage";
import { FileCvStorage } from "@server/storage/file-cv-storage";

let root: string;
let dir: string;
let remote: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function initRepo(folder: string): void {
  git(folder, "init", "-q", "-b", "main");
  git(folder, "config", "user.name", "Test");
  git(folder, "config", "user.email", "test@example.com");
  git(folder, "config", "commit.gpgsign", "false");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "cv-backup-"));
  dir = path.join(root, "data");
  remote = path.join(root, "remote.git");
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote]);
  execFileSync("mkdir", [dir]);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const cvFile = migrateCvFile(sample);
const variant = createVariant(cvFile.vault, cvFile.style, "acme", "Acme");

describe("GitDataRepo", () => {
  it("is off when the folder has no .git of its own", async () => {
    // a parent repository must not count
    initRepo(root);
    const service = new BackupService(new GitDataRepo(dir));
    expect(service.isEnabled).toBe(false);
    await service.commit("x");
    expect(git(root, "status", "--porcelain")).not.toContain("data");
    expect(await service.status()).toEqual({
      isEnabled: false,
      hasRemote: false,
      unpushedCommits: 0,
    });
  });

  it("commits changes and skips empty commits", async () => {
    initRepo(dir);
    const repo = new GitDataRepo(dir);
    await writeFile(path.join(dir, "a.json"), "{}");
    await repo.commit("first");
    await repo.commit("nothing changed");
    expect(git(dir, "log", "--format=%s")).toBe("first");
  });

  it("counts unpushed commits and pushes", async () => {
    initRepo(dir);
    git(dir, "remote", "add", "origin", remote);
    const service = new BackupService(new GitDataRepo(dir));
    await writeFile(path.join(dir, "a.json"), "{}");
    await service.commit("first");
    expect(await service.status()).toMatchObject({
      isEnabled: true,
      hasRemote: true,
      unpushedCommits: 1,
    });
    const status = await service.push();
    expect(status.unpushedCommits).toBe(0);
    expect(git(remote, "log", "--format=%s", "main")).toBe("first");
  });
});

describe("VersionedCvStorage", () => {
  it("commits after each save and delete", async () => {
    initRepo(dir);
    const backup = new BackupService(new GitDataRepo(dir));
    const storage = new VersionedCvStorage(new FileCvStorage(dir), backup);
    await storage.saveVault(cvFile);
    const { template } = splitVariant(variant, "tpl1", "2026-11-07");
    await storage.saveTemplate(template);
    await storage.deleteTemplate("tpl1");
    expect(git(dir, "log", "--format=%s")).toBe(
      ["Delete: template tpl1", "Save: template tpl1", "Save: vault"].join("\n")
    );
  });

  it("saves even when git fails, and reports the problem", async () => {
    const failing: DataRepo = {
      isEnabled: () => true,
      commit: () => Promise.reject(new Error("boom")),
      push: () => Promise.resolve(),
      countUnpushed: () => Promise.resolve(0),
      hasRemote: () => Promise.resolve(false),
    };
    const backup = new BackupService(failing);
    const files = new FileCvStorage(dir);
    await new VersionedCvStorage(files, backup).saveVault(cvFile);
    expect(await files.loadVault()).toEqual(cvFile);
    expect((await backup.status()).lastError).toContain("boom");
  });
});

describe("VersionedCvStorage templates and jobs", () => {
  it("commits every template and job change", async () => {
    initRepo(dir);
    const storage = new VersionedCvStorage(
      new FileCvStorage(dir),
      new BackupService(new GitDataRepo(dir))
    );
    const { template, job } = splitVariant(variant, "tpl1", "2026-11-07");
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    await storage.deleteJob("acme");
    await storage.deleteTemplate("tpl1");
    expect(git(dir, "log", "--format=%s")).toBe(
      [
        "Delete: template tpl1",
        "Delete: job acme",
        "Save: job acme",
        "Save: template tpl1",
      ].join("\n")
    );
  });
});

describe("/api/backup", () => {
  it("reports off without a backup", async () => {
    const app = buildServer({ storage: new FileCvStorage(dir) });
    const get = await app.inject({ method: "GET", url: "/api/backup" });
    expect(get.json().isEnabled).toBe(false);
    const push = await app.inject({ method: "POST", url: "/api/backup/push" });
    expect(push.statusCode).toBe(501);
    await app.close();
  });

  it("pushes the data repository", async () => {
    initRepo(dir);
    git(dir, "remote", "add", "origin", remote);
    const backup = new BackupService(new GitDataRepo(dir));
    const app = buildServer({
      storage: new VersionedCvStorage(new FileCvStorage(dir), backup),
      backup,
    });
    await app.inject({ method: "PUT", url: "/api/vault", payload: cvFile });
    const before = await app.inject({ method: "GET", url: "/api/backup" });
    expect(before.json().unpushedCommits).toBe(1);
    const push = await app.inject({ method: "POST", url: "/api/backup/push" });
    expect(push.statusCode).toBe(200);
    expect(push.json().unpushedCommits).toBe(0);
    await app.close();
  });

  it("reports a failed push", async () => {
    initRepo(dir);
    git(dir, "remote", "add", "origin", path.join(root, "missing.git"));
    const backup = new BackupService(new GitDataRepo(dir));
    const app = buildServer({
      storage: new VersionedCvStorage(new FileCvStorage(dir), backup),
      backup,
    });
    await app.inject({ method: "PUT", url: "/api/vault", payload: cvFile });
    const push = await app.inject({ method: "POST", url: "/api/backup/push" });
    expect(push.statusCode).toBe(502);
    expect(push.json().code).toBe("backup_failed");
    await app.close();
  });
});
