import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createZip } from "@server/export/zip";
import { buildApplicationsExport } from "@server/export/applications-export";
import { CvStorage } from "@shared/storage/cv-storage";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { buildServer } from "@server/app";
import sample from "@fixtures/sample-cv.json";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const NOW = new Date("2026-11-12T10:00:00Z");

/** Reads the names and contents of a stored-only ZIP made by createZip */
function readZip(zip: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let at = 0;
  while (zip.readUInt32LE(at) === 0x04034b50) {
    const size = zip.readUInt32LE(at + 18);
    const nameLength = zip.readUInt16LE(at + 26);
    const name = zip.subarray(at + 30, at + 30 + nameLength).toString("utf8");
    const start = at + 30 + nameLength;
    entries.set(name, zip.subarray(start, start + size));
    at = start + size;
  }
  return entries;
}

describe("createZip", () => {
  it("stores every entry with its name and bytes", () => {
    const zip = createZip([
      { name: "a/x.txt", data: Buffer.from("hello") },
      { name: "b.pdf", data: Buffer.alloc(300, 7) },
    ]);
    const entries = readZip(zip);
    expect([...entries.keys()]).toEqual(["a/x.txt", "b.pdf"]);
    expect(entries.get("a/x.txt")?.toString()).toBe("hello");
    expect(entries.get("b.pdf")?.length).toBe(300);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
  });
});

describe("buildApplicationsExport", () => {
  let dir: string;
  let storage: CvStorage;
  const PDF = Buffer.from("%PDF-1.7 fake");

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-export-"));
    storage = new FileCvStorage(dir);
    const file = migrateCvFile(structuredClone(sample));
    const app = buildServer({
      storage,
      pdf: {
        render: () => Promise.resolve(PDF),
        close: () => Promise.resolve(),
      },
      now: () => NOW,
    });
    await app.inject({ method: "PUT", url: "/api/vault", payload: file });
    const variant = createVariant(file.vault, file.style, "acme", "Acme");
    const { template, job } = splitVariant(variant, "tpl", "2026-11-07");
    await app.inject({
      method: "PUT",
      url: "/api/templates/tpl",
      payload: template,
    });
    await app.inject({ method: "PUT", url: "/api/jobs/acme", payload: job });
    for (const company of ["One", "Two"]) {
      await app.inject({
        method: "POST",
        url: "/api/applications",
        payload: { jobId: "acme", company, role: "Dev" },
      });
    }
    await app.close();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("puts every application, its PDF, a summary and an index in one ZIP", async () => {
    const result = await buildApplicationsExport(storage, NOW);
    expect(result.fileName).toBe("squeezy-cv-applications-2026-11-12.zip");
    expect(result.exportedCount).toBe(2);
    expect(result.problems).toEqual([]);
    const entries = readZip(result.zip);
    const jsons = [...entries.keys()].filter((n) =>
      n.endsWith("application.json")
    );
    expect(jsons).toHaveLength(2);
    expect(
      [...entries.keys()].filter((n) => n.endsWith("cv.pdf"))
    ).toHaveLength(2);
    const application = JSON.parse(entries.get(jsons[0])!.toString());
    expect(application.meta.kind).toBe("application");
    expect(entries.get("summary.csv")!.toString()).toContain("One");
    expect(
      JSON.parse(entries.get("index.json")!.toString()).exportedCount
    ).toBe(2);
  });

  it("lists a damaged application instead of hiding the others", async () => {
    const [first] = await storage.listApplications();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(dir, "applications", first.id, "application.json"),
      "{ not json"
    );
    const result = await buildApplicationsExport(storage, NOW);
    expect(result.exportedCount).toBe(1);
    expect(result.problems.map((p) => p.id)).toEqual([first.id]);
  });

  it("the route downloads the ZIP; with no applications it says so", async () => {
    const app = buildServer({ storage, now: () => NOW });
    const ok = await app.inject({
      method: "GET",
      url: "/api/applications/export",
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["content-type"]).toBe("application/zip");
    expect(ok.headers["content-disposition"]).toContain(
      "squeezy-cv-applications-2026-11-12.zip"
    );
    await app.close();

    const empty = await mkdtemp(path.join(os.tmpdir(), "cv-export-empty-"));
    const emptyApp = buildServer({
      storage: new FileCvStorage(empty),
      now: () => NOW,
    });
    const none = await emptyApp.inject({
      method: "GET",
      url: "/api/applications/export",
    });
    expect(none.statusCode).toBe(404);
    await emptyApp.close();
    await rm(empty, { recursive: true, force: true });
  });
});
