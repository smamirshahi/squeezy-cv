/* eslint-disable @typescript-eslint/naming-convention -- Playwright option names (exact, acceptDownloads) */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
import { sampleFile } from "@e2e/fixtures";

const KEY_DELAY_MS = 150;

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage({ acceptDownloads: true });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

/** Moves a part of the page one place up with the keyboard (dnd-kit: Space, arrow, Space) */
async function moveUp(label: string): Promise<void> {
  const part = page
    .locator('[aria-roledescription="sortable"]')
    .filter({ hasText: label });
  await part.focus();
  // dnd-kit starts listening for the arrow keys a moment after the pick-up
  await page.keyboard.press("Space");
  await page.waitForTimeout(KEY_DELAY_MS);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(KEY_DELAY_MS);
  await page.keyboard.press("Space");
  await page.waitForTimeout(KEY_DELAY_MS);
}

describe("editing in the browser, saving, and exporting a PDF", () => {
  it("loads the saved vault, hides an item, reorders a section, saves and exports", async () => {
    await page.goto(app.webUrl);

    // The saved CV is loaded from the server
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    // measured by the real browser: the short sample is one page, no warning
    await page.getByText("1 page (limit 2)").waitFor();

    // Hide an item in this variant (Variants page)
    await page.getByRole("button", { name: "Variants", exact: true }).click();
    await page.getByLabel("Software Developer", { exact: true }).uncheck();
    await page.getByText("Unsaved changes").waitFor();

    // Reorder: Education above Work Experience (Page Structure page)
    await page.getByRole("button", { name: "Page Structure" }).click();
    await moveUp("Education");

    // Save to the server
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();

    // Export the PDF
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF" }).click();
    const file = await (await download).path();
    const { readFile } = await import("node:fs/promises");
    const pdf = await readPdf(await readFile(file));

    expect(pdf.pageCount).toBe(1);
    expect(pdf.text).toContain("Jane Doe");
    expect(pdf.text).toContain("Senior Software Developer");
    // hidden in the variant
    expect(pdf.text).not.toContain("Sample Systems");
    // reordered
    expect(pdf.text.indexOf("University of Example")).toBeGreaterThan(-1);
    expect(pdf.text.indexOf("University of Example")).toBeLessThan(
      pdf.text.indexOf("Example Ltd")
    );
  });

  it("keeps the edits after a reload (they were saved on the server)", async () => {
    await page.reload();
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();

    // the preview shows the hidden item as hidden and the new order
    const preview = await page
      .locator(".MuiPaper-root", { hasText: "Jane Doe" })
      .last()
      .innerText();
    expect(preview).not.toContain("Sample Systems");
    expect(preview.indexOf("University of Example")).toBeLessThan(
      preview.indexOf("Example Ltd")
    );
  });
});
