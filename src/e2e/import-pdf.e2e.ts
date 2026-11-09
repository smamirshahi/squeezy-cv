import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage();
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("PDF import", () => {
  // Skipped while the import button is disabled ("Coming soon"); see the issue to bring it back
  it.skip("puts the text of an uploaded PDF in the import box", async () => {
    await page.goto(app.webUrl);
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    await page
      .getByRole("button", { name: "Paste CV text, AI sorts it" })
      .click();

    await page.getByLabel("PDF file").setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: makeTestPdf(["Alex Morgan", "Developer at Acme"]),
    });
    const box = page.getByLabel("Your CV text");
    await expect
      .poll(async () => box.inputValue(), { timeout: 15_000 })
      .toContain("Alex Morgan");
    expect(await box.inputValue()).toContain("Developer at Acme");

    // The text can be edited before it is sorted
    await box.fill("Edited text");
    expect(await box.inputValue()).toBe("Edited text");

    // A file that is not a PDF is refused with a reason
    await page.getByLabel("PDF file").setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not really a pdf"),
    });
    await page.getByText("This file is not a PDF.").waitFor();
  });
});
