import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import {
  MAX_IMPORT_PDF_BYTES,
  MAX_IMPORT_PDF_PAGES,
} from "@custom-types/import-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { createApiClient, ApiError } from "@store/persistence/api-client";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { openKvStore } from "@store/persistence/browser/idb-kv";
import { createLocalFetch } from "@store/persistence/browser/local-api";

const file = migrateCvFile(sample);
let counter = 0;
let api: ReturnType<typeof createApiClient>;

beforeEach(() => {
  counter += 1;
  const storage = new IdbCvStorage(openKvStore(`local-api-db-${counter}`));
  api = createApiClient(createLocalFetch(storage));
});

const { template, job } = splitVariant(
  createVariant(file.vault, file.style, "j1", "Job one"),
  "t1",
  "2026-11-07"
);

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  return error instanceof ApiError ? error.code : undefined;
}

describe("the API client on IndexedDB", () => {
  it("saves and loads the vault, and says not_found before the first save", async () => {
    expect(await codeOf(api.loadVault())).toBe("not_found");
    await api.saveVault(file);
    expect((await api.loadVault()).vault).toEqual(file.vault);
  });

  it("saves a job only with an existing template and resolves it", async () => {
    expect(await codeOf(api.saveJob(job))).toBe("invalid");
    await api.saveTemplate(template);
    await api.saveJob(job);
    expect((await api.loadResolvedJob("j1")).id).toBe("j1");
  });

  it("refuses to delete a template that a job uses", async () => {
    await api.saveTemplate(template);
    await api.saveJob(job);
    expect(await codeOf(api.deleteTemplate("t1"))).toBe("in_use");
    await api.deleteJob("j1");
    await api.deleteTemplate("t1");
    expect(await api.listTemplates()).toEqual([]);
  });

  it("creates, edits and deletes an application without a CV", async () => {
    const created = await api.createApplication({
      company: "Acme",
      role: "Dev",
      withoutCv: true,
    });
    const updated = await api.updateApplication(created.id, {
      status: "interview",
    });
    expect(updated.status).toBe("interview");
    expect(await api.listApplications()).toHaveLength(1);
    await api.deleteApplication(created.id);
    expect(await api.listApplications()).toEqual([]);
  });

  it("keeps candidates", async () => {
    const candidate = await api.createCandidate({
      company: "Acme",
      role: "Dev",
    });
    expect(await api.listCandidates()).toHaveLength(1);
    await api.deleteCandidate(candidate.id);
    expect(await api.listCandidates()).toEqual([]);
  });

  it("still answers 501 for what needs the server", async () => {
    const response = await createLocalFetch(
      new IdbCvStorage(openKvStore(`local-api-501-${counter}`))
    )("/api/feedback", { method: "POST", body: "{}" });
    expect(response.status).toBe(501);
    expect(((await response.json()) as { code: string }).code).toBe(
      "browser_unavailable"
    );
  });
});

describe("reading a PDF to import, on this device", () => {
  const pdf = (bytes: Uint8Array): Blob => new Blob([new Uint8Array(bytes)]);

  it("returns the text layer and the page count", async () => {
    const result = await api.extractPdfText(
      pdf(makeTestPdf(["Alex Morgan", "Developer at Acme"], 2))
    );
    expect(result.pages).toBe(2);
    expect(result.text).toContain("Alex Morgan");
    expect(result.text).toContain("Developer at Acme");
  });

  it("answers like the server: the same status and code for each refusal", async () => {
    const send = (body: BodyInit | undefined): Promise<Response> =>
      createLocalFetch(
        new IdbCvStorage(openKvStore(`local-api-pdf-${counter}`))
      )("/api/import/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body,
      });
    const answer = async (
      body: BodyInit | undefined
    ): Promise<{ status: number; code: string | undefined }> => {
      const response = await send(body);
      return {
        status: response.status,
        code: ((await response.json()) as { code?: string }).code,
      };
    };
    expect(await answer(pdf(new TextEncoder().encode("plain text")))).toEqual({
      status: 400,
      code: "not_pdf",
    });
    expect(await answer(undefined)).toEqual({ status: 400, code: "not_pdf" });
    expect(await answer(pdf(makeTestPdf([])))).toEqual({
      status: 400,
      code: "no_text",
    });
    expect(
      await answer(pdf(makeTestPdf(["x"], MAX_IMPORT_PDF_PAGES + 1)))
    ).toEqual({ status: 400, code: "too_many_pages" });
    expect(await answer(pdf(new Uint8Array(MAX_IMPORT_PDF_BYTES + 1)))).toEqual(
      { status: 413, code: "too_large" }
    );
  });

  it("gives the client the message to show", async () => {
    const error = await api
      .extractPdfText(pdf(new TextEncoder().encode("plain text")))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("This file is not a PDF.");
  });

  it("does not save anything", async () => {
    const kv = openKvStore(`local-api-nosave-${counter}`);
    const local = createLocalFetch(new IdbCvStorage(kv));
    await local("/api/import/pdf", {
      method: "POST",
      body: pdf(makeTestPdf(["Alex Morgan"])),
    });
    expect(await kv.keys("")).toEqual([]);
  });
});
