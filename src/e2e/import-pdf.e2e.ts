import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { LINKEDIN_PROFILE_LINES } from "@fixtures/linkedin-profile-lines";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("PDF import", () => {
  it("lists an uploaded PDF as read and refuses one that is not a PDF", async () => {
    await page.goto(app.webUrl);
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    await page
      .getByRole("button", { name: "Paste CV text, AI sorts it" })
      .click();

    await page.getByLabel("PDF file", { exact: true }).setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: makeTestPdf(["Alex Morgan", "Developer at Acme"]),
    });
    // The PDF is listed as read; its text is not copied into the paste box any more
    await page.getByText(/cv\.pdf: read/).waitFor({ timeout: 15_000 });
    const box = page.getByLabel("Or paste CV text");
    expect(await box.inputValue()).toBe("");

    // The box is for text that is not in a PDF, and can be typed in
    await box.fill("Edited text");
    expect(await box.inputValue()).toBe("Edited text");

    // A file that is not a PDF is refused with a reason
    await page.getByLabel("PDF file", { exact: true }).setInputFiles({
      name: "fake.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not really a pdf"),
    });
    await page
      .getByText(/fake\.pdf: failed \(This file is not a PDF\./)
      .waitFor();
  });
});

describe("Several PDFs", () => {
  it("lists every chosen PDF, a LinkedIn profile among them, and lets one be removed", async () => {
    await page.goto(app.webUrl);
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    await page
      .getByRole("button", { name: "Paste CV text, AI sorts it" })
      .click();

    await page.getByLabel("PDF file", { exact: true }).setInputFiles([
      {
        name: "cv-2021.pdf",
        mimeType: "application/pdf",
        buffer: makeTestPdf([
          "Jane Doe",
          "Software Developer at Northwind Labs",
        ]),
      },
      {
        name: "linkedin.pdf",
        mimeType: "application/pdf",
        buffer: makeTestPdf(LINKEDIN_PROFILE_LINES),
      },
    ]);
    await page.getByText(/cv-2021\.pdf: read/).waitFor({ timeout: 15_000 });
    await page.getByText(/linkedin\.pdf: read/).waitFor({ timeout: 15_000 });

    await page.getByRole("button", { name: "Remove" }).first().click();
    await page.getByText(/cv-2021\.pdf: read/).waitFor({ state: "detached" });
    await page.getByText(/linkedin\.pdf: read/).waitFor();
  });
});
