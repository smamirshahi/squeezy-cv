import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";
import { buildServer } from "@server/app";
import { PdfRenderer, PlaywrightPdfRenderer } from "@server/pdf/pdf-renderer";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";
import { Variant } from "@custom-types/variant-types";
import { splitVariant } from "@shared/variant/template-job";
import { CvFile } from "@custom-types/vault-types";

export interface RunningApp {
  /** The web app, e.g. http://localhost:5301 */
  webUrl: string;

  /** The API, e.g. http://127.0.0.1:41233 */
  apiUrl: string;

  /** Saves a CV file and, for each resolved variant, a template (`template-<id>`) and a job (`<id>`) */
  seed: (file: CvFile, variants: Variant[]) => Promise<void>;

  /** Saves a CV file, templates and jobs (the current format) */
  seedJobs: (file: CvFile, templates: Template[], jobs: Job[]) => Promise<void>;

  /** Asks the API for the PDF of a saved job (POST /api/pdf {jobId}) */
  pdfOfJob: (jobId: string) => Promise<Buffer>;

  /** A PDF of a saved job, made by the real renderer */
  pdf: (jobId: string) => Promise<Buffer>;

  close: () => Promise<void>;
}

/**
 * Starts the real thing on free ports: the API on a temporary data folder, the web app
 * (Vite, proxying /api to it) and the Chromium PDF renderer.
 */
export async function startApp(): Promise<RunningApp> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "cv-e2e-"));

  // The renderer needs the web address, which needs the API address: hook it up afterwards
  const holder: { renderer?: PlaywrightPdfRenderer } = {};
  const pdfRenderer: PdfRenderer = {
    render: (id) => {
      if (!holder.renderer) {
        return Promise.reject(new Error("The web app is not started."));
      }
      return holder.renderer.render(id);
    },
    close: () => holder.renderer?.close() ?? Promise.resolve(),
  };

  const api = buildServer({
    storage: new FileCvStorage(dataDir),
    pdf: pdfRenderer,
  });
  await api.listen({ host: "127.0.0.1", port: 0 });
  const apiUrl = `http://127.0.0.1:${(api.server.address() as AddressInfo).port}`;

  // vite.config.ts reads PORT to know where to proxy /api
  process.env.PORT = String(new URL(apiUrl).port);
  const web = await createServer({
    configFile: "vite.config.ts",
    logLevel: "error",
    server: { port: 0 },
  });
  await web.listen();
  const webUrl = (web.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  holder.renderer = new PlaywrightPdfRenderer(webUrl);

  async function put(url: string, body: unknown): Promise<void> {
    const response = await fetch(`${apiUrl}${url}`, {
      method: "PUT",
      // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Seeding ${url} failed: ${response.status}`);
    }
  }

  return {
    webUrl,
    apiUrl,
    seed: async (file, variants) => {
      const pairs = variants.map((variant) =>
        splitVariant(
          variant,
          `template-${variant.id}`.slice(0, 64),
          new Date().toISOString().slice(0, 10)
        )
      );
      await put("/api/vault", file);
      for (const { template } of pairs) {
        await put(`/api/templates/${template.id}`, template);
      }
      for (const { job } of pairs) {
        await put(`/api/jobs/${job.id}`, job);
      }
    },
    seedJobs: async (file, templates, jobs) => {
      await put("/api/vault", file);
      for (const template of templates) {
        await put(`/api/templates/${template.id}`, template);
      }
      for (const job of jobs) {
        await put(`/api/jobs/${job.id}`, job);
      }
    },
    pdfOfJob: async (jobId) => {
      const response = await fetch(`${apiUrl}/api/pdf`, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!response.ok) {
        throw new Error(`PDF of job ${jobId} failed: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    pdf: (jobId) => pdfRenderer.render(jobId),
    close: async () => {
      await web.close();
      await api.close();
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Node option names
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}
