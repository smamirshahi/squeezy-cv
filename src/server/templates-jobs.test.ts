import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { createVariant } from "@shared/variant/variant-utils";
import { resolveVariant, splitVariant } from "@shared/variant/template-job";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { buildServer } from "@server/app";
import { PdfRenderer } from "@server/pdf/pdf-renderer";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const file = migrateCvFile(sample);
const { template, job } = splitVariant(
  createVariant(file.vault, file.style, "acme", "Acme"),
  "tpl1",
  "2026-11-07"
);
const PDF = Buffer.from("%PDF-1.7 fake");

class FakePdf implements PdfRenderer {
  requested: string[] = [];
  shouldFail = false;

  render(id: string): Promise<Buffer> {
    this.requested.push(id);
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
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-tj-api-"));
  pdf = new FakePdf();
  app = buildServer({ storage: new FileCvStorage(dir), pdf });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the response type of inject() is not exported
function call(
  method: "GET" | "PUT" | "DELETE" | "POST",
  url: string,
  payload?: object
) {
  return app.inject({ method, url, payload });
}

async function seed(): Promise<void> {
  await call("PUT", "/api/templates/tpl1", template);
  await call("PUT", "/api/jobs/acme", job);
}

describe("templates API", () => {
  it("starts empty", async () => {
    const response = await call("GET", "/api/templates");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("saves, lists, reads and deletes a template", async () => {
    expect(
      (await call("PUT", "/api/templates/tpl1", template)).statusCode
    ).toBe(200);
    expect((await call("GET", "/api/templates")).json()).toEqual([
      { id: "tpl1", name: "Acme", isCorrupt: false },
    ]);
    expect((await call("GET", "/api/templates/tpl1")).json()).toEqual(template);
    expect((await call("DELETE", "/api/templates/tpl1")).statusCode).toBe(200);
    expect((await call("GET", "/api/templates/tpl1")).statusCode).toBe(404);
  });

  it("answers 404 for a missing template on delete", async () => {
    expect((await call("DELETE", "/api/templates/none")).statusCode).toBe(404);
  });

  it("validates the body and the id", async () => {
    const bad = await call("PUT", "/api/templates/tpl1", { id: "tpl1" });
    expect(bad.statusCode).toBe(400);
    const mismatch = await call("PUT", "/api/templates/other", template);
    expect(mismatch.statusCode).toBe(400);
    expect(mismatch.json().code).toBe("invalid");
    expect(
      (await call("PUT", "/api/templates/a.b", { ...template, id: "a.b" }))
        .statusCode
    ).toBe(400);
    expect((await call("GET", "/api/templates/a.b")).statusCode).toBe(400);
    expect(await readdir(dir)).toEqual([]);
  });

  it("refuses to delete a template that a job uses (409 in_use)", async () => {
    await seed();
    const response = await call("DELETE", "/api/templates/tpl1");
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("in_use");
    expect((await call("GET", "/api/templates/tpl1")).statusCode).toBe(200);

    await call("DELETE", "/api/jobs/acme");
    expect((await call("DELETE", "/api/templates/tpl1")).statusCode).toBe(200);
  });

  it("reports a corrupt template as 500 corrupt", async () => {
    await call("PUT", "/api/templates/tpl1", template);
    await writeFile(path.join(dir, "templates", "tpl1.json"), "{");
    const response = await call("GET", "/api/templates/tpl1");
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("corrupt");
  });
});

describe("jobs API", () => {
  it("saves, lists, reads and deletes a job", async () => {
    await call("PUT", "/api/templates/tpl1", template);
    expect((await call("PUT", "/api/jobs/acme", job)).statusCode).toBe(200);
    expect((await call("GET", "/api/jobs")).json()).toEqual([
      {
        id: "acme",
        name: "Acme",
        templateId: "tpl1",
        createdAt: "2026-11-07",
        isCorrupt: false,
      },
    ]);
    expect((await call("GET", "/api/jobs/acme")).json()).toEqual(job);
    expect((await call("DELETE", "/api/jobs/acme")).statusCode).toBe(200);
    expect((await call("GET", "/api/jobs/acme")).statusCode).toBe(404);
    expect((await call("DELETE", "/api/jobs/acme")).statusCode).toBe(404);
  });

  it("refuses a job whose template does not exist", async () => {
    const response = await call("PUT", "/api/jobs/acme", job);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("invalid");
    expect((await call("GET", "/api/jobs")).json()).toEqual([]);
  });

  it("validates the body and the id", async () => {
    await call("PUT", "/api/templates/tpl1", template);
    expect(
      (await call("PUT", "/api/jobs/acme", { id: "acme" })).statusCode
    ).toBe(400);
    expect((await call("PUT", "/api/jobs/other", job)).statusCode).toBe(400);
    expect(
      (await call("PUT", "/api/jobs/a b", { ...job, id: "a b" })).statusCode
    ).toBe(400);
    expect((await call("GET", "/api/jobs/..%2Fx")).statusCode).toBe(400);
  });

  it("returns the job drawn with its template as a variant", async () => {
    await seed();
    const response = await call("GET", "/api/jobs/acme/resolved");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      createVariant(file.vault, file.style, "acme", "Acme")
    );
    await call("PUT", "/api/templates/tpl1", { ...template, pageLimit: 2 });
    expect(
      (await call("GET", "/api/jobs/acme/resolved")).json().pageLimit
    ).toBe(2);
  });
});

describe("legacy variants over the API", () => {
  it("appear as a template and a job, and the old routes still work", async () => {
    const variant = createVariant(file.vault, file.style, "old", "Old");
    expect((await call("PUT", "/api/variants/old", variant)).statusCode).toBe(
      200
    );
    expect(
      (await call("GET", "/api/jobs")).json().map((j: { id: string }) => j.id)
    ).toEqual(["old"]);
    expect((await call("GET", "/api/templates")).json()[0].id).toBe(
      "template-old"
    );
    expect((await call("GET", "/api/jobs/old/resolved")).json()).toEqual(
      variant
    );
    expect((await call("GET", "/api/variants/old")).json()).toEqual(variant);
    // a used legacy template cannot be deleted either
    expect(
      (await call("DELETE", "/api/templates/template-old")).statusCode
    ).toBe(409);
  });
});

describe("applications from a job", () => {
  it("freezes the job drawn with its template when the id is a job id", async () => {
    await call("PUT", "/api/vault", file);
    await seed();
    const response = await call("POST", "/api/applications", {
      jobId: "acme",
      company: "Acme Ltd",
      role: "Dev",
    });
    expect(response.statusCode).toBe(200);
    const application = response.json();
    expect(application.submitted.variant.id).toBe("acme");
    expect(application.submitted.variant).toEqual(
      resolveVariant(template, job)
    );
    expect(pdf.requested).toEqual(["acme"]);
  });

  it("answers 404 when neither a job nor a variant has that id", async () => {
    await call("PUT", "/api/vault", file);
    const response = await call("POST", "/api/applications", {
      jobId: "nope",
      company: "A",
      role: "B",
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("PDF of a job", () => {
  it("renders the job id after checking job and template", async () => {
    await seed();
    const response = await call("POST", "/api/pdf", { jobId: "acme" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.rawPayload.equals(PDF)).toBe(true);
    expect(pdf.requested).toEqual(["acme"]);
  });

  it("answers 404 for a missing job and does not start the renderer", async () => {
    expect((await call("POST", "/api/pdf", { jobId: "nope" })).statusCode).toBe(
      404
    );
    expect(pdf.requested).toEqual([]);
  });

  it("answers 404 when the job's template is gone", async () => {
    await seed();
    await rm(path.join(dir, "templates", "tpl1.json"));
    expect((await call("POST", "/api/pdf", { jobId: "acme" })).statusCode).toBe(
      404
    );
    expect(pdf.requested).toEqual([]);
  });

  it("rejects a bad job id and reports a renderer failure", async () => {
    expect((await call("POST", "/api/pdf", { jobId: "../x" })).statusCode).toBe(
      400
    );
    expect((await call("POST", "/api/pdf", { jobId: 5 })).statusCode).toBe(400);
    await seed();
    pdf.shouldFail = true;
    const response = await call("POST", "/api/pdf", { jobId: "acme" });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("pdf_failed");
  });

  it("still renders by variantId", async () => {
    await call(
      "PUT",
      "/api/variants/old",
      createVariant(file.vault, file.style, "old", "Old")
    );
    expect(
      (await call("POST", "/api/pdf", { variantId: "old" })).statusCode
    ).toBe(200);
    expect(pdf.requested).toEqual(["old"]);
  });
});

describe("applications are frozen copies", () => {
  async function applyAcme(): Promise<{ id: string }> {
    await call("PUT", "/api/vault", file);
    await seed();
    const response = await call("POST", "/api/applications", {
      jobId: "acme",
      company: "Acme Ltd",
      role: "Dev",
    });
    expect(response.statusCode).toBe(200);
    return response.json();
  }

  async function stored(id: string): Promise<{ json: string; pdf: Buffer }> {
    const base = path.join(dir, "applications", id);
    return {
      json: await readFile(path.join(base, "application.json"), "utf8"),
      pdf: await readFile(path.join(base, "cv.pdf")),
    };
  }

  it("records the job and template (ids and names) and lists them", async () => {
    const { id } = await applyAcme();
    const application = (await call("GET", `/api/applications/${id}`)).json();
    expect(application).toMatchObject({
      jobId: "acme",
      templateId: "tpl1",
      jobName: job.name,
      templateName: template.name,
    });
    expect((await call("GET", "/api/applications")).json()).toEqual([
      expect.objectContaining({
        id,
        jobId: "acme",
        templateId: "tpl1",
        jobName: job.name,
        templateName: template.name,
      }),
    ]);
  });

  it("editing, renaming or deleting the template and the job after Mark as applied changes neither the stored application nor its PDF", async () => {
    const { id } = await applyAcme();
    const before = await stored(id);

    const editedTemplate = {
      ...template,
      name: "Renamed look",
      pageLimit: template.pageLimit === 1 ? 2 : 1,
    };
    expect(
      (await call("PUT", "/api/templates/tpl1", editedTemplate)).statusCode
    ).toBe(200);
    const editedJob = {
      ...job,
      name: "Renamed job",
      selection: { anything: { isVisible: false } },
    };
    expect((await call("PUT", "/api/jobs/acme", editedJob)).statusCode).toBe(
      200
    );
    const afterEdit = await stored(id);
    expect(afterEdit.json).toBe(before.json);
    expect(afterEdit.pdf.equals(before.pdf)).toBe(true);

    // no lock: the job and then its template can even be deleted
    expect((await call("DELETE", "/api/jobs/acme")).statusCode).toBe(200);
    expect((await call("DELETE", "/api/templates/tpl1")).statusCode).toBe(200);
    const afterDelete = await stored(id);
    expect(afterDelete.json).toBe(before.json);
    expect(afterDelete.pdf.equals(before.pdf)).toBe(true);
    const download = await call("GET", `/api/applications/${id}/pdf`);
    expect(download.rawPayload).toEqual(PDF);
  });

  it("the old variant routes are not locked either", async () => {
    await call("PUT", "/api/vault", file);
    const variant = createVariant(file.vault, file.style, "old", "Old");
    await call("PUT", "/api/variants/old", variant);
    const { id } = (
      await call("POST", "/api/applications", {
        jobId: "old",
        company: "A",
        role: "B",
      })
    ).json();
    expect(id).toBeTruthy();
    expect(
      (await call("PUT", "/api/variants/old", { ...variant, name: "New" }))
        .statusCode
    ).toBe(200);
    expect((await call("DELETE", "/api/variants/old")).statusCode).toBe(200);
  });

  it("still reads an application file that has only the variant it was sent from", async () => {
    await call("PUT", "/api/vault", file);
    await seed();
    const { id } = await applyAcme();
    const base = path.join(dir, "applications", id);
    const raw = JSON.parse(
      await readFile(path.join(base, "application.json"), "utf8")
    );
    for (const key of ["jobId", "templateId", "jobName", "templateName"]) {
      delete raw[key];
    }
    await writeFile(path.join(base, "application.json"), JSON.stringify(raw));
    await mkdir(base, { recursive: true });

    const loaded = await call("GET", `/api/applications/${id}`);
    expect(loaded.statusCode).toBe(200);
    const [summary] = (await call("GET", "/api/applications")).json();
    expect(summary).toMatchObject({
      id,
      isCorrupt: false,
      jobId: "acme",
      jobName: raw.submitted.variant.name,
      templateId: "",
      templateName: "",
    });
  });
});
