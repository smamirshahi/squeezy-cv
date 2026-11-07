import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import { buildServer } from "@server/app";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";

describe("POST /api/import/pdf", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true })));
  });

  async function setup(): Promise<{
    app: Awaited<ReturnType<typeof buildServer>>;
    dir: string;
  }> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "cv-pdf-import-"));
    dirs.push(dir);
    return { app: await buildServer({ storage: new FileCvStorage(dir) }), dir };
  }

  function post(
    app: Awaited<ReturnType<typeof buildServer>>,
    payload: Buffer,
    contentType = "application/pdf"
  ): Promise<{
    statusCode: number;
    json: () => { text?: string; pages?: number; code?: string };
  }> {
    return app.inject({
      method: "POST",
      url: "/api/import/pdf",
      headers: { "content-type": contentType },
      payload,
    });
  }

  it("returns the text of a PDF and stores nothing", async () => {
    const { app, dir } = await setup();
    const response = await post(app, makeTestPdf(["Alex Morgan", "Acme"]));
    expect(response.statusCode).toBe(200);
    expect(response.json().text).toContain("Alex Morgan");
    expect(response.json().pages).toBe(1);
    expect(await readdir(dir)).toEqual([]);
  });

  it("answers 400 not_pdf for something that is not a PDF", async () => {
    const { app } = await setup();
    const response = await post(app, Buffer.from("hello"));
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("not_pdf");
  });

  it("answers 400 not_pdf for an empty body", async () => {
    const { app } = await setup();
    const response = await post(app, Buffer.alloc(0));
    expect(response.json().code).toBe("not_pdf");
  });

  it("answers 415 not_pdf for another content type", async () => {
    const { app } = await setup();
    const response = await post(
      app,
      makeTestPdf(["x"]),
      "application/octet-stream"
    );
    expect(response.statusCode).toBe(415);
    expect(response.json().code).toBe("not_pdf");
  });

  it("answers 413 too_large for a big file", async () => {
    const { app } = await setup();
    const response = await post(
      app,
      Buffer.alloc(MAX_IMPORT_PDF_BYTES + 100_000)
    );
    expect(response.statusCode).toBe(413);
    expect(response.json().code).toBe("too_large");
  });

  it("answers 400 no_text for a PDF without text", async () => {
    const { app } = await setup();
    const response = await post(app, makeTestPdf([]));
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("no_text");
  });

  it("keeps refusing a non-local Host", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/api/import/pdf",
      headers: { host: "evil.example", "content-type": "application/pdf" },
      payload: makeTestPdf(["x"]),
    });
    expect(response.statusCode).toBe(403);
  });
});
