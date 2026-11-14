import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
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

  it("keeps candidates, and answers 501 for reading a PDF to import", async () => {
    const candidate = await api.createCandidate({
      company: "Acme",
      role: "Dev",
    });
    expect(await api.listCandidates()).toHaveLength(1);
    await api.deleteCandidate(candidate.id);
    expect(await codeOf(api.extractPdfText(new Blob(["%PDF-1.7"])))).toBe(
      "browser_unavailable"
    );
  });
});
