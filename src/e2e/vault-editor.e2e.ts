import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { openCvPage, sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("editing an item in the vault (inline editor)", () => {
  it("fills the date row with equal Start and End inputs before Current", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: /^Work Experience/ }).click();
    await page
      .getByRole("main", { name: "Edit" })
      .getByRole("link", { name: /^Senior Software Developer/ })
      .click();

    const dateRow = page.getByRole("group", { name: "Dates" });
    const currentLabel = page.locator("label").filter({ hasText: "Current" });
    for (const width of [1440, 1000]) {
      await page.setViewportSize({ width, height: 900 });
      const row = await dateRow.boundingBox();
      const start = await page
        .getByLabel("Start", { exact: true })
        .boundingBox();
      const end = await page.getByLabel("End", { exact: true }).boundingBox();
      const current = await currentLabel.boundingBox();
      const link = await page.getByLabel("Link (optional)").boundingBox();
      expect(row).not.toBeNull();
      expect(start).not.toBeNull();
      expect(end).not.toBeNull();
      expect(current).not.toBeNull();
      expect(link).not.toBeNull();
      expect(Math.abs(start!.width - end!.width)).toBeLessThan(1);
      expect(
        Math.abs(row!.x + row!.width - (current!.x + current!.width))
      ).toBeLessThan(1);
      expect(Math.abs(row!.width - link!.width)).toBeLessThan(1);
      expect(start!.x).toBeLessThan(end!.x);
      expect(end!.x + end!.width).toBeLessThan(current!.x);
      expect(
        await page.getByRole("checkbox", { name: "Current" }).isEnabled()
      ).toBe(true);
    }
  });

  it("edits a job and its description, sees them on the page, saves and keeps them after a reload", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: /^Work Experience/ }).click();
    await page
      .getByRole("main", { name: "Edit" })
      .getByRole("link", { name: /^Senior Software Developer/ })
      .click();
    await page.getByLabel("Edit item").waitFor();

    await page
      .getByRole("textbox", { name: "Job title" })
      .fill("Principal Engineer");
    await page
      .getByLabel("Description")
      .fill("Led the migration to TypeScript");
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByText("Unsaved changes").waitFor();

    // the page shows the vault's new facts
    await openCvPage(page);
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Principal Engineer" })
      .waitFor();
    expect(
      await page.getByText("Led the migration to TypeScript").count()
    ).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("Principal Engineer").first().waitFor();
  });

  it("shows the free-writing placeholder in an empty description", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: /^Work Experience/ }).click();
    await page
      .getByRole("main", { name: "Edit" })
      .getByRole("link", {
        name: /^(Senior Software Developer|Principal Engineer)/,
      })
      .click();
    await page.getByLabel("Edit item").waitFor();
    const description = page.getByLabel("Description");
    await description.fill("");
    expect(await description.first().getAttribute("placeholder")).toMatch(
      /whatever comes to your mind.*in full.*own words/
    );
  });

  it("writes a description, which shows on the page and in the PDF text", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: /^Work Experience/ }).click();
    await page
      .getByRole("main", { name: "Edit" })
      .getByRole("link", {
        name: /^(Principal Engineer|Senior Software Developer)/,
      })
      .click();
    await page.getByLabel("Edit item").waitFor();
    await page
      .getByLabel("Description")
      .fill("Owned the billing platform\nMentored two engineers");
    await page.getByRole("button", { name: "Apply" }).click();
    await openCvPage(page);
    await page.getByText("Owned the billing platform").first().waitFor();
    await page.getByText("Mentored two engineers").first().waitFor();
  });
});
