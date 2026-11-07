import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
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
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("editing an item in the vault (inline editor)", () => {
  it("edits a job and a bullet, sees them on the page, saves and keeps them after a reload", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByRole("link", { name: "Vault" }).click();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: "Senior Software Developer" }).click();
    await page.getByLabel("Edit item").waitFor();

    await page.getByLabel("Job title").fill("Principal Engineer");
    await page
      .getByLabel("Bullet 1 text")
      .fill("Led the migration to TypeScript");
    await page.getByText("Unsaved changes").waitFor();

    // the page shows the vault's new facts
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Jobs" })
      .click();
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
});
