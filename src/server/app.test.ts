import { APP_VERSION } from "@shared/version";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { buildServer } from "@server/app";
import { PdfRenderer } from "@server/pdf/pdf-renderer";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { readConfig } from "@server/config";

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-server-"));
  app = buildServer({ storage: new FileCvStorage(dir) });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const cvFile = migrateCvFile(sample);
const variant = {
  ...createVariant(cvFile.vault, cvFile.style, "acme", "Acme"),
  tags: ["x"],
};

describe("health", () => {
  it("answers", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", version: APP_VERSION });
  });
});

describe("/api/vault", () => {
  it("is 404 until something is saved", async () => {
    const response = await app.inject({ method: "GET", url: "/api/vault" });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("not_found");
  });

  it("saves and returns the CV", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/vault",
      payload: cvFile,
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toEqual({ status: "saved" });

    const get = await app.inject({ method: "GET", url: "/api/vault" });
    expect(get.statusCode).toBe(200);
    expect(get.json()).toEqual(cvFile);
  });

  it.each([
    ["an empty object", {}],
    ["a legacy-format file", sample],
    [
      "an unknown section type",
      {
        ...cvFile,
        vault: {
          ...cvFile.vault,
          sections: [{ id: "x", type: "nonsense", title: "", items: [] }],
        },
      },
    ],
    ["a missing style", { metaData: cvFile.metaData, vault: cvFile.vault }],
  ])("rejects %s and saves nothing", async (_name, payload) => {
    const put = await app.inject({ method: "PUT", url: "/api/vault", payload });
    expect(put.statusCode).toBe(400);
    expect(put.json().code).toBe("invalid");
    expect(
      (await app.inject({ method: "GET", url: "/api/vault" })).statusCode
    ).toBe(404);
  });

  it("rejects a body that is not JSON", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/vault",
      headers: { "content-type": "application/json" },
      payload: "{ nope",
    });
    expect(put.statusCode).toBe(400);
  });

  it("does not accept a CV sent as plain text (what a cross-site form could send)", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/vault",
      headers: { "content-type": "text/plain" },
      payload: JSON.stringify(cvFile),
    });
    expect(put.statusCode).toBe(400);
    expect(
      (await app.inject({ method: "GET", url: "/api/vault" })).statusCode
    ).toBe(404);
  });

  it("reports a corrupt file with 500 and does not overwrite it by itself", async () => {
    await writeFile(path.join(dir, "vault.json"), "garbage");
    const get = await app.inject({ method: "GET", url: "/api/vault" });
    expect(get.statusCode).toBe(500);
    expect(get.json().code).toBe("corrupt");
    expect(await readFile(path.join(dir, "vault.json"), "utf8")).toBe(
      "garbage"
    );
  });

  it("can save over a corrupt file, keeping the old content aside", async () => {
    await writeFile(path.join(dir, "vault.json"), "garbage");
    const put = await app.inject({
      method: "PUT",
      url: "/api/vault",
      payload: cvFile,
    });
    expect(put.statusCode).toBe(200);
    expect(
      (await app.inject({ method: "GET", url: "/api/vault" })).json()
    ).toEqual(cvFile);
  });
});

describe("the old variant API", () => {
  it.each([
    ["GET", "/api/variants"],
    ["GET", "/api/variants/acme"],
    ["PUT", "/api/variants/acme"],
    ["DELETE", "/api/variants/acme"],
  ])("is gone: %s %s", async (method, url) => {
    const response = await app.inject({
      method: method as "GET",
      url,
      payload: method === "PUT" ? { id: "acme" } : undefined,
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("local-only guard", () => {
  it.each(["localhost:5173", "127.0.0.1:3001", "localhost", "[::1]:3001"])(
    "accepts the host %s",
    async (host) => {
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
        headers: { host },
      });
      expect(response.statusCode).toBe(200);
    }
  );

  it.each([
    "evil.example.com",
    "evil.example.com:3001",
    "localhost.evil.com",
    "192.168.1.5:3001",
  ])("rejects the host %s (DNS rebinding)", async (host) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host },
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects requests that come from another website", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/vault",
      headers: { host: "localhost:3001", origin: "https://evil.example.com" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("accepts the local dev page as origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "localhost:3001", origin: "http://localhost:5173" },
    });
    expect(response.statusCode).toBe(200);
  });

  it("rejects a malformed origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "localhost:3001", origin: "not a url" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("does not store anything for a rejected write", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/vault",
      payload: cvFile,
      headers: { host: "localhost:3001", origin: "https://evil.example.com" },
    });
    expect(put.statusCode).toBe(403);
    expect(
      (await app.inject({ method: "GET", url: "/api/vault" })).statusCode
    ).toBe(404);
  });
});

describe("readConfig", () => {
  it("has safe defaults: local only, port 3001, ./data", () => {
    expect(readConfig({}, "/work")).toEqual({
      host: "127.0.0.1",
      port: 3001,
      dataDir: "/work/data",
      webUrl: "http://localhost:5173",
    });
  });

  it("reads PORT and DATA_DIR, relative to the working folder", () => {
    expect(
      readConfig({ PORT: "4000", DATA_DIR: "mine" }, "/work")
    ).toMatchObject({
      port: 4000,
      dataDir: "/work/mine",
    });
    expect(readConfig({ DATA_DIR: "/abs/dir" }, "/work").dataDir).toBe(
      "/abs/dir"
    );
  });

  it.each(["abc", "0", "70000", "3.5", "-1"])("rejects the port %s", (port) => {
    expect(() => readConfig({ PORT: port }, "/work")).toThrow(/PORT/);
  });

  it("takes WEB_URL only if it points to this machine", () => {
    expect(
      readConfig({ WEB_URL: "http://localhost:4173" }, "/work").webUrl
    ).toBe("http://localhost:4173");
    for (const bad of [
      "https://example.com",
      "http://127.0.0.1.evil.com",
      "file:///etc/passwd",
      "not a url",
    ]) {
      expect(() => readConfig({ WEB_URL: bad }, "/work")).toThrow(/WEB_URL/);
    }
  });
});

describe("POST /api/pdf", () => {
  const PDF_BYTES = Buffer.from("%PDF-1.7 fake");

  class FakePdf implements PdfRenderer {
    requested: string[] = [];
    shouldFail = false;
    isClosed = false;

    render(jobId: string): Promise<Buffer> {
      this.requested.push(jobId);
      return this.shouldFail
        ? Promise.reject(new Error("Chromium is missing"))
        : Promise.resolve(PDF_BYTES);
    }

    close(): Promise<void> {
      this.isClosed = true;
      return Promise.resolve();
    }
  }

  let pdf: FakePdf;

  beforeEach(async () => {
    await app.close();
    pdf = new FakePdf();
    app = buildServer({ storage: new FileCvStorage(dir), pdf });
    const { template, job } = splitVariant(variant, "tpl", "2026-11-07");
    await app.inject({
      method: "PUT",
      url: "/api/templates/tpl",
      payload: template,
    });
    await app.inject({ method: "PUT", url: "/api/jobs/acme", payload: job });
  });

  type Injected = Awaited<ReturnType<FastifyInstance["inject"]>>;

  async function post(payload: unknown): Promise<Injected> {
    return app.inject({
      method: "POST",
      url: "/api/pdf",
      payload: payload as object,
    });
  }

  it("returns the PDF for a saved job", async () => {
    const response = await post({ jobId: "acme" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toContain("acme.pdf");
    expect(response.rawPayload.equals(PDF_BYTES)).toBe(true);
    expect(pdf.requested).toEqual(["acme"]);
  });

  it.each([{}, { jobId: 5 }, { jobId: "../vault" }, { jobId: "a b" }])(
    "refuses a bad job id %j without rendering",
    async (body) => {
      const response = await post(body);
      expect(response.statusCode).toBe(400);
      expect(pdf.requested).toEqual([]);
    }
  );

  it("answers 404 for a job that is not saved, without rendering", async () => {
    const response = await post({ jobId: "nope" });
    expect(response.statusCode).toBe(404);
    expect(pdf.requested).toEqual([]);
  });

  it("explains a failed render", async () => {
    pdf.shouldFail = true;
    const response = await post({ jobId: "acme" });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("pdf_failed");
    expect(response.json().message).toContain("Chromium is missing");
  });

  it("answers 501 when the server has no PDF renderer", async () => {
    await app.close();
    app = buildServer({ storage: new FileCvStorage(dir) });
    expect((await post({ jobId: "acme" })).statusCode).toBe(501);
  });

  it("is refused for non-local requests like every other route", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/pdf",
      headers: { host: "evil.example.com" },
      payload: { jobId: "acme" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("closes the renderer when the server closes", async () => {
    await app.close();
    expect(pdf.isClosed).toBe(true);
  });
});
