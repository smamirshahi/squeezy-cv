import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { createServer, ViteDevServer } from "vite";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import { MAX_IMPORT_PDF_PAGES } from "@custom-types/import-types";

const SEEN_TUTORIALS = [
  "squeezy-cv-vault-tutorial-seen",
  "squeezy-cv-template-tutorial-seen",
  "squeezy-cv-apply-tutorial-seen",
  "squeezy-cv-applications-tutorial-seen",
  "squeezy-cv-ai-tutorial-seen",
];

let web: ViteDevServer;
let browser: Browser;
let webUrl: string;

beforeAll(async () => {
  // The browser version: no server at all
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

async function newContext(): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addInitScript((tutorials) => {
    for (const key of tutorials) {
      localStorage.setItem(key, "1");
    }
  }, SEEN_TUTORIALS);
  return context;
}

/** The import dialog of the Vault page, open and waiting for a PDF */
async function openImport(page: Page): Promise<void> {
  await page.goto(`${webUrl}/vault`);
  await page
    .getByRole("button", { name: "Paste CV text, AI sorts it" })
    .click();
  await page.getByLabel("PDF file", { exact: true }).waitFor({
    state: "attached",
  });
}

async function choose(page: Page, buffer: Buffer): Promise<void> {
  await page.getByLabel("PDF file", { exact: true }).setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer,
  });
}

describe("PDF import without a server (real Chromium)", () => {
  it("reads the text on this device and sends the file nowhere", async () => {
    const context = await newContext();
    const page = await context.newPage();
    const requests: { url: string; method: string; hasBody: boolean }[] = [];
    page.on("request", (request) =>
      requests.push({
        url: request.url(),
        method: request.method(),
        hasBody: request.postData() !== null,
      })
    );
    await openImport(page);
    const before = requests.length;

    await choose(page, makeTestPdf(["Alex Morgan", "Developer at Acme"], 2));
    const box = page.getByLabel("Your CV text");
    await expect
      .poll(async () => box.inputValue(), { timeout: 20_000 })
      .toContain("Alex Morgan");
    expect(await box.inputValue()).toContain("Developer at Acme");
    await page
      .getByText(/Read 2 pages|2 pages/)
      .first()
      .waitFor();

    // Reading the PDF needed no upload: no request carried a body, and no address of
    // ours was called for the file
    const after = requests.slice(before);
    expect(after.filter((request) => request.method !== "GET")).toEqual([]);
    expect(after.filter((request) => request.hasBody)).toEqual([]);
    expect(
      after.filter((request) => request.url.includes("/api/import/pdf"))
    ).toEqual([]);
    // Everything fetched came from this app (the PDF reader is a separate file loaded when needed)
    expect(after.filter((request) => !request.url.startsWith(webUrl))).toEqual(
      []
    );

    // The text can be edited before it is sorted
    await box.fill("Edited text");
    expect(await box.inputValue()).toBe("Edited text");
  });

  it("keeps reading PDFs when the network goes away (the reader is already loaded)", async () => {
    const context = await newContext();
    const page = await context.newPage();
    await openImport(page);
    // Load the reader once, then lose the network
    await choose(page, makeTestPdf(["First"]));
    await expect
      .poll(async () => page.getByLabel("Your CV text").inputValue(), {
        timeout: 20_000,
      })
      .toContain("First");
    await context.setOffline(true);
    await choose(page, makeTestPdf(["Second line"]));
    await expect
      .poll(async () => page.getByLabel("Your CV text").inputValue(), {
        timeout: 20_000,
      })
      .toContain("Second line");
  });

  it("refuses a file that is not a PDF, with the same reason as the server", async () => {
    const page = await (await newContext()).newPage();
    await openImport(page);
    await choose(page, Buffer.from("not really a pdf"));
    await page.getByText("This file is not a PDF.").waitFor();
    expect(await page.getByLabel("Your CV text").inputValue()).toBe("");
  });

  it("says a scanned PDF has no text layer", async () => {
    const page = await (await newContext()).newPage();
    await openImport(page);
    await choose(page, makeTestPdf([]));
    await page.getByText(/no text layer/).waitFor();
    expect(await page.getByLabel("Your CV text").inputValue()).toBe("");
  });

  it("refuses a PDF with too many pages", async () => {
    const page = await (await newContext()).newPage();
    await openImport(page);
    await choose(page, makeTestPdf(["x"], MAX_IMPORT_PDF_PAGES + 1));
    await page.getByText(/the limit is 20/).waitFor();
  });

  it("refuses a PDF over the size limit without reading it", async () => {
    const page = await (await newContext()).newPage();
    await openImport(page);
    await choose(page, Buffer.alloc(5 * 1024 * 1024 + 1, 37));
    await page.getByText(/larger than 5 MB/).waitFor();
  });
});
