import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { getDocumentProxy } from "unpdf";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

const STYLED_PT = 20;
const PX_PER_PT = 96 / 72;
const TOLERANCE = 1;

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

/** Font size in px of a heading on the paper */
async function paperHeadingSize(title: RegExp): Promise<number> {
  const heading = page.locator("[data-cv-paper]").getByText(title).first();
  await heading.waitFor();
  return heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}

/** Text height (the font size, in points) of the first text run matching the pattern */
async function pdfTextSize(bytes: Buffer, title: RegExp): Promise<number> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const content = await (await pdf.getPage(number)).getTextContent();
    for (const item of content.items) {
      if ("str" in item && title.test(item.str)) {
        return item.height;
      }
    }
  }
  throw new Error(`no text matching ${title} in the PDF`);
}

describe("style per section", () => {
  it("one section gets its own heading style; the preview and the PDF match", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    const globalSize = await paperHeadingSize(/Education/i);

    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("button", { name: "Templates" })
      .click();
    await page
      .getByRole("region", { name: "Section styles" })
      .getByText(/Changes template/)
      .waitFor();
    await page.getByLabel("Section", { exact: true }).click();
    await page.getByRole("option", { name: /Work Experience/i }).click();
    await page.getByLabel("Heading size (pt)").fill(String(STYLED_PT));
    await page.getByLabel("Line under the heading").uncheck();

    // the sample on the Templates page already shows it
    const sample = page.getByTestId("sample-cv").getByText(/Work Experience/i);
    await sample.first().waitFor();

    // the CV page follows
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("button", { name: "Jobs" })
      .click();
    const styled = await paperHeadingSize(/Work Experience/i);
    expect(Math.abs(styled - STYLED_PT * PX_PER_PT)).toBeLessThan(TOLERANCE);
    expect(await paperHeadingSize(/Education/i)).toBe(globalSize);

    // save and export: the PDF has the same heading size, other sections keep the global one
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    const bytes = await app.pdfOfJob("main");
    const styledPt = await pdfTextSize(bytes, /Work Experience/i);
    const globalPt = await pdfTextSize(bytes, /Education/i);
    expect(Math.abs(styledPt - STYLED_PT)).toBeLessThan(TOLERANCE);
    expect(globalPt).toBeLessThan(STYLED_PT - TOLERANCE);
  }, 120_000);
});
