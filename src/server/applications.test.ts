import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
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

  render(variantId: string): Promise<Buffer> {
    this.requested.push(variantId);
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
  await app.inject({
    method: "PUT",
    url: "/api/variants/acme",
    payload: variant,
  });
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
      variantId: "acme",
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

  it("keeps the sent CV when the vault changes afterwards", async () => {
    const { id } = (
      await apply({ variantId: "acme", company: "A", role: "B" })
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
      variantId: "acme",
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
      payload: { variantId: "acme", company: "A", role: "B" },
    });
    expect(response.statusCode).toBe(501);
    await bare.close();
  });

  it("rejects missing company, bad dates and unknown variants", async () => {
    expect(
      (await apply({ variantId: "acme", company: " ", role: "B" })).statusCode
    ).toBe(400);
    expect(
      (
        await apply({
          variantId: "acme",
          company: "A",
          role: "B",
          appliedAt: "soon",
        })
      ).statusCode
    ).toBe(400);
    expect((await apply({ company: "A", role: "B" })).statusCode).toBe(400);
    expect(
      (await apply({ variantId: "nope", company: "A", role: "B" })).statusCode
    ).toBe(404);
  });

  it("records status changes on the timeline and lists them", async () => {
    const { id } = (
      await apply({ variantId: "acme", company: "A", role: "B" })
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
      await apply({ variantId: "acme", company: "A", role: "B" })
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
