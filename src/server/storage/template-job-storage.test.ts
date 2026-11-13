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
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { resolveVariant, splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { StorageError } from "@shared/storage/cv-storage";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const file = migrateCvFile(sample);

function makePair(
  id: string,
  name: string,
  templateId = `t-${id}`
): ReturnType<typeof splitVariant> {
  return splitVariant(
    createVariant(file.vault, file.style, id, name),
    templateId,
    "2026-11-07"
  );
}

let dir: string;
let storage: FileCvStorage;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-tj-"));
  storage = new FileCvStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function expectCode(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(StorageError);
  expect((error as StorageError).code).toBe(code);
}

describe("templates", () => {
  it("lists nothing at first and reports a missing template", async () => {
    expect(await storage.listTemplates()).toEqual([]);
    await expectCode(storage.loadTemplate("nope"), "not_found");
  });

  it("saves, lists, loads and deletes", async () => {
    const { template } = makePair("a", "A");
    await storage.saveTemplate(template);
    expect(await storage.listTemplates()).toEqual([
      { id: template.id, name: "A", isCorrupt: false },
    ]);
    expect(await storage.loadTemplate(template.id)).toEqual(template);

    await storage.deleteTemplate(template.id);
    expect(await storage.listTemplates()).toEqual([]);
    await expectCode(storage.deleteTemplate(template.id), "not_found");
    // the deleted file is kept aside, like variants
    expect(await readdir(path.join(dir, "templates"))).toEqual([
      `${template.id}.json.deleted`,
    ]);
  });

  it("overwrites and keeps the previous version as .bak", async () => {
    const { template } = makePair("a", "A");
    await storage.saveTemplate(template);
    await storage.saveTemplate({ ...template, name: "B" });
    expect((await storage.loadTemplate(template.id)).name).toBe("B");
    const bak = JSON.parse(
      await readFile(
        path.join(dir, "templates", `${template.id}.json.bak`),
        "utf8"
      )
    ) as { name: string };
    expect(bak.name).toBe("A");
  });

  it("leaves no temporary files behind", async () => {
    const { template } = makePair("a", "A");
    await storage.saveTemplate(template);
    await storage.saveTemplate({ ...template, name: "B" });
    const names = await readdir(path.join(dir, "templates"));
    expect(names.filter((n) => n.includes(".tmp"))).toEqual([]);
  });

  it("rejects ids that are not safe file names", async () => {
    const { template } = makePair("a", "A");
    for (const id of ["../evil", "a/b", "", "x".repeat(65), "a.b"]) {
      await expectCode(storage.loadTemplate(id), "invalid_id");
      await expectCode(storage.deleteTemplate(id), "invalid_id");
      await expectCode(storage.saveTemplate({ ...template, id }), "invalid_id");
    }
  });

  it("reports a corrupt file, keeps it untouched and still lists the others", async () => {
    const { template } = makePair("a", "A");
    await storage.saveTemplate(template);
    await writeFile(path.join(dir, "templates", "broken.json"), "{ nope");
    await writeFile(
      path.join(dir, "templates", "wrong.json"),
      '{"id":"wrong"}'
    );
    await expectCode(storage.loadTemplate("broken"), "corrupt");
    await expectCode(storage.loadTemplate("wrong"), "corrupt");
    const list = await storage.listTemplates();
    expect(list.filter((t) => t.isCorrupt).map((t) => t.id)).toEqual([
      "broken",
      "wrong",
    ]);
    expect(list.find((t) => t.id === template.id)?.isCorrupt).toBe(false);
    expect(
      await readFile(path.join(dir, "templates", "broken.json"), "utf8")
    ).toBe("{ nope");
  });

  it("refuses a file whose id differs from its name", async () => {
    const { template } = makePair("a", "A");
    await mkdir(path.join(dir, "templates"));
    await writeFile(
      path.join(dir, "templates", "other.json"),
      JSON.stringify(template)
    );
    await expectCode(storage.loadTemplate("other"), "corrupt");
  });

  it("moves an unreadable existing file aside instead of using it as backup", async () => {
    const { template } = makePair("a", "A");
    await mkdir(path.join(dir, "templates"));
    await writeFile(path.join(dir, "templates", `${template.id}.json`), "junk");
    await storage.saveTemplate(template);
    const names = await readdir(path.join(dir, "templates"));
    expect(names.some((n) => n.includes(".corrupt-"))).toBe(true);
    expect(await storage.loadTemplate(template.id)).toEqual(template);
  });
});

describe("jobs", () => {
  it("saves, lists, loads and deletes", async () => {
    const { job } = makePair("a", "A");
    await storage.saveJob({ ...job, company: "Acme", role: "Dev" });
    expect(await storage.listJobs()).toEqual([
      {
        id: "a",
        name: "A",
        templateId: "t-a",
        company: "Acme",
        role: "Dev",
        createdAt: "2026-11-07",
        isCorrupt: false,
      },
    ]);
    expect((await storage.loadJob("a")).company).toBe("Acme");
    await storage.deleteJob("a");
    expect(await storage.listJobs()).toEqual([]);
    await expectCode(storage.loadJob("a"), "not_found");
    await expectCode(storage.deleteJob("a"), "not_found");
  });

  it("rejects bad ids and reports corrupt files", async () => {
    const { job } = makePair("a", "A");
    await expectCode(storage.loadJob("../x"), "invalid_id");
    await expectCode(storage.saveJob({ ...job, id: "a b" }), "invalid_id");
    await expectCode(storage.deleteJob("a/b"), "invalid_id");
    await storage.saveJob(job);
    await writeFile(path.join(dir, "jobs", "broken.json"), "[");
    await expectCode(storage.loadJob("broken"), "corrupt");
    const list = await storage.listJobs();
    expect(list.map((j) => [j.id, j.isCorrupt])).toEqual([
      ["a", false],
      ["broken", true],
    ]);
  });
});

describe("legacy variants", () => {
  async function writeVariant(id: string, name: string): Promise<void> {
    await mkdir(path.join(dir, "variants"), { recursive: true });
    await writeFile(
      path.join(dir, "variants", `${id}.json`),
      JSON.stringify(createVariant(file.vault, file.style, id, name))
    );
  }

  it("are read as one template and one job each", async () => {
    await writeVariant("acme", "Acme");
    await writeVariant("beta", "Beta");
    const templates = await storage.listTemplates();
    const jobs = await storage.listJobs();
    expect(templates.map((t) => [t.id, t.name])).toEqual([
      ["template-acme", "Acme"],
      ["template-beta", "Beta"],
    ]);
    expect(jobs.map((j) => [j.id, j.templateId])).toEqual([
      ["acme", "template-acme"],
      ["beta", "template-beta"],
    ]);
    // the job drawn with its template is the original variant
    const variant = createVariant(file.vault, file.style, "acme", "Acme");
    const resolved = resolveVariant(
      await storage.loadTemplate("template-acme"),
      await storage.loadJob("acme")
    );
    expect(resolved).toEqual(variant);
  });

  it("does not write or delete anything when only read", async () => {
    await writeVariant("acme", "Acme");
    await storage.listJobs();
    await storage.loadTemplate("template-acme");
    const entries = await readdir(dir);
    expect(entries).toEqual(["variants"]);
    expect(await readdir(path.join(dir, "variants"))).toEqual(["acme.json"]);
  });

  it("are written out at the first save, so they survive and are not read twice", async () => {
    await writeVariant("acme", "Acme");
    const { job } = makePair("new", "New", "template-acme");
    await storage.saveJob(job);
    expect((await storage.listJobs()).map((j) => j.id)).toEqual([
      "acme",
      "new",
    ]);
    expect((await storage.listTemplates()).map((t) => t.id)).toEqual([
      "template-acme",
    ]);
    // variants are untouched
    expect(await readdir(path.join(dir, "variants"))).toEqual(["acme.json"]);
  });

  it("do not come back after everything was deleted", async () => {
    await writeVariant("acme", "Acme");
    await storage.deleteJob("acme");
    await storage.deleteTemplate("template-acme");
    expect(await storage.listJobs()).toEqual([]);
    expect(await storage.listTemplates()).toEqual([]);
  });

  it("are ignored once real job files exist", async () => {
    const { template, job } = makePair("real", "Real");
    await storage.saveTemplate(template);
    await storage.saveJob(job);
    await writeVariant("old", "Old");
    expect((await storage.listJobs()).map((j) => j.id)).toEqual(["real"]);
    await expectCode(storage.loadJob("old"), "not_found");
  });

  it("skip a damaged variant file", async () => {
    await writeVariant("acme", "Acme");
    await writeFile(path.join(dir, "variants", "bad.json"), "{");
    expect((await storage.listJobs()).map((j) => j.id)).toEqual(["acme"]);
  });
});
