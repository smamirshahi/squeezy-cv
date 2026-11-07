/* eslint-disable @typescript-eslint/naming-convention -- Playwright option names (exact, acceptDownloads) */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
import { sampleFile } from "@e2e/fixtures";

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

describe("editing in the browser, saving, and exporting a PDF", () => {
  it("loads the saved vault, hides an item, reorders a section, saves and exports", async () => {
    await page.goto(app.webUrl);

    // The saved CV is loaded from the server
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    // measured by the real browser: the short sample is one page, no warning
    await page.getByText(/^1 page \(limit 2\)/).waitFor();

    // Hide an item in this variant: click it on the page, use the inspector
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .click();
    await page.getByRole("button", { name: "Shown", exact: true }).click();
    await page.getByText("Unsaved changes").waitFor();

    // Reorder: Education above Work Experience (sections list in the page inspector)
    await page.getByRole("button", { name: "Back to page settings" }).click();
    await page.getByRole("button", { name: "Move Education up" }).click();

    // Save to the server
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();

    // Export the PDF
    await page.getByRole("button", { name: "Export PDF" }).click();
    await page.getByText("Text is selectable").waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
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

  it("marks the CV as applied, keeps what was sent, and tracks the status", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Mark as applied" }).click();
    await page.getByRole("textbox", { name: /^Company/ }).fill("Acme Ltd");
    await page.getByRole("textbox", { name: /^Role/ }).fill("Senior Dev");
    await page.getByRole("button", { name: "Save application" }).click();
    await page.getByText("Saved: Acme Ltd, Senior Dev").waitFor();
    await page.getByRole("link", { name: "View" }).click();

    // The application page: who, where it stands, and the CV that was sent
    await page.getByRole("heading", { name: "Acme Ltd" }).waitFor();
    await page.getByText("The CV you sent").waitFor();
    const src = await page.locator("iframe").getAttribute("src");
    expect(src).toMatch(/^\/api\/applications\/.+\/pdf$/);
    const response = await page.request.get(`${app.webUrl}${src}`);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    const sent = await readPdf(await response.body());
    expect(sent.pageCount).toBe(1);
    expect(sent.text).toContain("Jane Doe");

    // Hearing back: change the status
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Interview" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("listitem").filter({ hasText: "Interview" }).waitFor();

    // It is still there after a reload, with the whole timeline
    await page.reload();
    await page.getByRole("heading", { name: "Acme Ltd" }).waitFor();
    await page.getByRole("listitem").filter({ hasText: "Interview" }).waitFor();
    await page.getByRole("listitem").filter({ hasText: "Applied" }).waitFor();
  });

  it("lists the applications, opens one, and goes back to the same search", async () => {
    await page.goto(`${app.webUrl}/?applications`);
    await page.getByRole("heading", { name: "Applications" }).waitFor();
    await page.getByText("1 application: 1 interview").waitFor();
    const row = page.getByRole("row").filter({ hasText: "Acme Ltd" });
    await row.getByText("Interview").waitFor();

    // search narrows the list and the address remembers it
    await page.getByLabel("Search company or role").fill("senior");
    await page.getByRole("row").filter({ hasText: "Acme Ltd" }).waitFor();
    await page.getByLabel("Search company or role").fill("nothing like this");
    await page.getByText("No application matches this search.").waitFor();
    await page.getByLabel("Search company or role").fill("acme");

    // click the row: the application opens in the side panel, the list stays
    await page.getByRole("row").filter({ hasText: "Acme Ltd" }).click();
    await page
      .getByRole("complementary", { name: "Application detail" })
      .getByRole("heading", { name: "Acme Ltd" })
      .waitFor();
    await page.getByRole("row").filter({ hasText: "Acme Ltd" }).waitFor();

    // the company link opens the full page
    await page.getByRole("link", { name: "Acme Ltd", exact: true }).click();
    await page.getByRole("heading", { name: "Acme Ltd" }).waitFor();

    // back keeps the search
    await page.getByRole("link", { name: "← All applications" }).click();
    await page.getByRole("heading", { name: "Applications" }).waitFor();
    expect(await page.getByLabel("Search company or role").inputValue()).toBe(
      "acme"
    );
  });
});
