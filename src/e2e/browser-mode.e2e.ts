import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium } from "playwright";
import { createServer, ViteDevServer } from "vite";
import sample from "@fixtures/sample-cv.json";
import { createApplication } from "@shared/application/application-utils";
import { withExportMeta } from "@shared/migration/export-meta";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";
import { readPdf } from "@e2e/read-pdf";

/** A4 in points, with a little tolerance for rounding */
const A4_PT = { width: 595.28, height: 841.89 };
const TOLERANCE_PT = 1.5;

const file = migrateCvFile(sample);
const variant = createVariant(file.vault, file.style, "short", "Short");
const { template, job } = splitVariant(variant, "tpl-short", "2026-11-07");
const application = createApplication(
  { company: "Acme", role: "Developer" },
  file.vault,
  variant,
  "2026-11-07",
  "abcd",
  { jobId: job.id, templateId: template.id }
);

const RECORDS: Record<string, unknown> = {
  "vault.json": withExportMeta(file, "vault", file.vault.version),
  [`templates/${template.id}.json`]: withExportMeta(
    template,
    "template",
    template.version
  ),
  [`jobs/${job.id}.json`]: withExportMeta(job, "job", job.version),
  [`applications/${application.id}/application.json`]: withExportMeta(
    application,
    "application",
    application.version
  ),
};

let web: ViteDevServer;
let browser: Browser;
let webUrl: string;

beforeAll(async () => {
  // The browser version: no server, the data is in IndexedDB
  process.env.VITE_STORAGE_MODE = "browser";
  web = await createServer({
    configFile: "vite.config.ts",
    logLevel: "error",
    server: { port: 0 },
  });
  await web.listen();
  webUrl = (web.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await web?.close();
  delete process.env.VITE_STORAGE_MODE;
});

/** Opens the app in a fresh browser profile with the records already in IndexedDB */
async function seededPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${webUrl}/robots.txt`);
  await page.evaluate(async (records) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("cv-builder", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("files");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const transaction = open.result.transaction("files", "readwrite");
        const store = transaction.objectStore("files");
        for (const [key, value] of Object.entries(records)) {
          store.put(value, key);
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, RECORDS);
  return page;
}

describe("browser mode (real Chromium, no server)", () => {
  it("opens a deep link and prints a job to an A4 PDF with a text layer", async () => {
    const page = await seededPage();
    await page.goto(`${webUrl}/print/${job.id}`);
    await page.waitForSelector("[data-cv-ready]");
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright option names
    const pdf = await readPdf(
      await page.pdf({ preferCSSPageSize: true, printBackground: true })
    );
    expect(pdf.pageCount).toBe(1);
    expect(Math.abs(pdf.pageSize.width - A4_PT.width)).toBeLessThan(
      TOLERANCE_PT
    );
    expect(Math.abs(pdf.pageSize.height - A4_PT.height)).toBeLessThan(
      TOLERANCE_PT
    );
    expect(pdf.text).toContain(file.vault.profile.fullName);
  });

  it("draws a sent application from its frozen copy, as many pages as the job", async () => {
    const page = await seededPage();
    await page.goto(`${webUrl}/print/${job.id}`);
    await page.waitForSelector("[data-cv-ready]");
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright option names
    const jobPdf = await readPdf(
      await page.pdf({ preferCSSPageSize: true, printBackground: true })
    );
    await page.goto(`${webUrl}/print-application/${application.id}`);
    await page.waitForSelector("[data-cv-ready]");
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Playwright option names
    const sent = await readPdf(
      await page.pdf({ preferCSSPageSize: true, printBackground: true })
    );
    expect(sent.pageCount).toBe(jobPdf.pageCount);
    expect(sent.text).toContain(file.vault.profile.fullName);
    expect(Math.abs(sent.pageSize.height - A4_PT.height)).toBeLessThan(
      TOLERANCE_PT
    );
  });
});
