import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { buildServer } from "@server/app";
import { PdfRenderer } from "@server/pdf/pdf-renderer";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const file = migrateCvFile(sample);
const variant = createVariant(file.vault, file.style, "acme", "Acme");
const PDF = Buffer.from("%PDF-1.7 fake");

class FakePdf implements PdfRenderer {
  requested: string[] = [];
  shouldFail = false;

  render(jobId: string): Promise<Buffer> {
    this.requested.push(jobId);
    return this.shouldFail
      ? Promise.reject(new Error("Chromium is missing"))
      : Promise.resolve(PDF);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

let dir: string;
let app: FastifyInstance;
let pdf: FakePdf;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-app-routes-"));
  pdf = new FakePdf();
  app = buildServer({
    storage: new FileCvStorage(dir),
    pdf,
    now: () => new Date(2026, 10, 6),
  });
  await app.inject({ method: "PUT", url: "/api/vault", payload: file });
  const { template, job } = splitVariant(variant, "tpl", "2026-11-07");
  await app.inject({
    method: "PUT",
    url: "/api/templates/tpl",
    payload: template,
  });
  await app.inject({ method: "PUT", url: "/api/jobs/acme", payload: job });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the response type of inject() is not exported
function apply(payload: object) {
  return app.inject({ method: "POST", url: "/api/applications", payload });
}

describe("/api/applications", () => {
  it("Mark as applied: freezes the CV, makes the PDF, starts as Applied today", async () => {
    const response = await apply({
      jobId: "acme",
      company: "Acme Ltd",
      role: "Dev",
      jobUrl: "https://acme.example/jobs/1",
    });
    expect(response.statusCode).toBe(200);
    const application = response.json();
    expect(application).toMatchObject({
      company: "Acme Ltd",
      status: "applied",
      appliedAt: "2026-11-06",
      history: [{ status: "applied", at: "2026-11-06" }],
    });
    expect(pdf.requested).toEqual(["acme"]);

    const download = await app.inject({
      method: "GET",
      url: `/api/applications/${application.id}/pdf`,
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-type"]).toBe("application/pdf");
    expect(download.rawPayload).toEqual(PDF);
  });

  it("applied elsewhere without a CV: stores the facts, makes no PDF", async () => {
    const response = await apply({
      withoutCv: true,
      via: "Glassdoor",
      company: "Beta Ltd",
      role: "Dev",
      jobUrl: `https://example.com/?${"a=1&".repeat(100)}`,
    });
    expect(response.statusCode).toBe(200);
    const application = response.json();
    expect(application.appliedVia).toBe("Glassdoor");
    expect(application.submitted).toBeUndefined();
    expect(pdf.requested).toEqual([]);
    const download = await app.inject({
      method: "GET",
      url: `/api/applications/${application.id}/pdf`,
    });
    expect(download.statusCode).toBe(404);
  });

  it("stores the PDF of a CV sent elsewhere, and refuses anything that is not a PDF", async () => {
    const { id } = (
      await apply({ withoutCv: true, via: "Email", company: "B", role: "D" })
    ).json();
    const url = `/api/applications/${id}/pdf`;
    const headers = { "content-type": "application/pdf" };
    const notPdf = await app.inject({
      method: "PUT",
      url,
      headers,
      payload: Buffer.from("hello"),
    });
    expect(notPdf.statusCode).toBe(400);
    const saved = await app.inject({
      method: "PUT",
      url,
      headers,
      payload: PDF,
    });
    expect(saved.statusCode).toBe(200);
    const download = await app.inject({ method: "GET", url });
    expect(download.rawPayload).toEqual(PDF);
  });

  it("will not replace the frozen CV of an application made in the app", async () => {
    const { id } = (
      await apply({ jobId: "acme", company: "A", role: "B" })
    ).json();
    const response = await app.inject({
      method: "PUT",
      url: `/api/applications/${id}/pdf`,
      headers: { "content-type": "application/pdf" },
      payload: PDF,
    });
    expect(response.statusCode).toBe(409);
  });

  it("needs a job when a CV is sent", async () => {
    const response = await apply({ company: "A", role: "B" });
    expect(response.statusCode).toBe(400);
  });

  it("keeps the sent CV when the vault changes afterwards", async () => {
    const { id } = (
      await apply({ jobId: "acme", company: "A", role: "B" })
    ).json();
    const changed = structuredClone(file);
    changed.vault.profile.fullName = "Someone Else";
    await app.inject({ method: "PUT", url: "/api/vault", payload: changed });
    const stored = (
      await app.inject({ method: "GET", url: `/api/applications/${id}` })
    ).json();
    expect(JSON.stringify(stored.submitted.document)).toContain("Jane Doe");
    expect(JSON.stringify(stored.submitted.document)).not.toContain(
      "Someone Else"
    );
  });

  it("stores nothing when the PDF cannot be made", async () => {
    pdf.shouldFail = true;
    const response = await apply({
      jobId: "acme",
      company: "A",
      role: "B",
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("pdf_failed");
    const list = await app.inject({ method: "GET", url: "/api/applications" });
    expect(list.json()).toEqual([]);
  });

  it("answers 501 without a PDF renderer", async () => {
    const bare = buildServer({ storage: new FileCvStorage(dir) });
    const response = await bare.inject({
      method: "POST",
      url: "/api/applications",
      payload: { jobId: "acme", company: "A", role: "B" },
    });
    expect(response.statusCode).toBe(501);
    await bare.close();
  });

  it("rejects missing company, bad dates and unknown jobs", async () => {
    expect(
      (await apply({ jobId: "acme", company: " ", role: "B" })).statusCode
    ).toBe(400);
    expect(
      (
        await apply({
          jobId: "acme",
          company: "A",
          role: "B",
          appliedAt: "soon",
        })
      ).statusCode
    ).toBe(400);
    expect((await apply({ company: "A", role: "B" })).statusCode).toBe(400);
    expect(
      (await apply({ jobId: "nope", company: "A", role: "B" })).statusCode
    ).toBe(404);
  });

  it("records status changes on the timeline and lists them", async () => {
    const { id } = (
      await apply({ jobId: "acme", company: "A", role: "B" })
    ).json();
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/applications/${id}`,
      payload: {
        status: "interview",
        statusAt: "2026-11-14",
        statusNote: "Phone screen",
      },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().history).toEqual([
      { status: "applied", at: "2026-11-06" },
      { status: "interview", at: "2026-11-14", note: "Phone screen" },
    ]);
    const list = (
      await app.inject({ method: "GET", url: "/api/applications" })
    ).json();
    expect(list).toEqual([
      expect.objectContaining({
        id,
        status: "interview",
        updatedAt: "2026-11-14",
      }),
    ]);
    const bad = await app.inject({
      method: "PATCH",
      url: `/api/applications/${id}`,
      payload: { status: "hired" },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("deletes and then answers 404", async () => {
    const { id } = (
      await apply({ jobId: "acme", company: "A", role: "B" })
    ).json();
    const del = await app.inject({
      method: "DELETE",
      url: `/api/applications/${id}`,
    });
    expect(del.json()).toEqual({ status: "deleted" });
    const get = await app.inject({
      method: "GET",
      url: `/api/applications/${id}`,
    });
    expect(get.statusCode).toBe(404);
  });
});

describe("backup file", () => {
  it("downloads everything and restores it into an empty data folder", async () => {
    const download = await app.inject({
      method: "GET",
      url: "/api/backup/file",
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-disposition"]).toContain(
      "cv-builder-backup-2026-11-06.json"
    );
    const other = await mkdtemp(path.join(os.tmpdir(), "cv-app-restore-"));
    const target = buildServer({ storage: new FileCvStorage(other), pdf });
    try {
      const restored = await target.inject({
        method: "POST",
        url: "/api/backup/file",
        payload: download.json(),
      });
      expect(restored.statusCode).toBe(200);
      expect(restored.json()).toMatchObject({
        vault: true,
        templates: 1,
        jobs: 1,
      });
      const vault = await target.inject({ method: "GET", url: "/api/vault" });
      expect(vault.json().vault).toEqual(file.vault);
      const refused = await target.inject({
        method: "POST",
        url: "/api/backup/file",
        payload: { hello: "world" },
      });
      expect(refused.statusCode).toBe(400);
    } finally {
      await target.close();
      await rm(other, { recursive: true, force: true });
    }
  });
});
