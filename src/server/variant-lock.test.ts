import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-lock-"));
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

describe("variant lock", () => {
  async function put(query = ""): Promise<number> {
    return (
      await app.inject({
        method: "PUT",
        url: `/api/variants/acme${query}`,
        payload: { ...variant, name: "Renamed" },
      })
    ).statusCode;
  }
  async function del(query = ""): Promise<number> {
    return (
      await app.inject({ method: "DELETE", url: `/api/variants/acme${query}` })
    ).statusCode;
  }

  it("is open until the variant is sent", async () => {
    expect(await put()).toBe(200);
  });

  it("refuses writes and deletes with 409 locked while an application is Applied", async () => {
    await apply({ variantId: "acme", company: "A", role: "B" });
    expect(await put()).toBe(409);
    const response = await app.inject({
      method: "DELETE",
      url: "/api/variants/acme",
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("locked");
  });

  it("allows them with an explicit ?unlock=true", async () => {
    await apply({ variantId: "acme", company: "A", role: "B" });
    expect(await put("?unlock=true")).toBe(200);
    expect(await del("?unlock=true")).toBe(200);
  });

  it("unlocks by itself when the status moves on, and stays locked while any is Applied", async () => {
    const first = (
      await apply({ variantId: "acme", company: "A", role: "B" })
    ).json();
    const second = (
      await apply({ variantId: "acme", company: "C", role: "D" })
    ).json();
    const move = (id: string): Promise<unknown> =>
      app.inject({
        method: "PATCH",
        url: `/api/applications/${id}`,
        payload: { status: "interview" },
      });
    await move(first.id);
    expect(await put()).toBe(409);
    await move(second.id);
    expect(await put()).toBe(200);
  });

  it("stays locked when an application file is damaged", async () => {
    await mkdir(path.join(dir, "applications", "broken"), { recursive: true });
    await writeFile(
      path.join(dir, "applications", "broken", "application.json"),
      "{ not json"
    );
    expect(await put()).toBe(409);
  });
});
