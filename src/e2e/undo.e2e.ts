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
  page = await browser.newPage();
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("undo and redo of manual edits", () => {
  it("undoes hiding an item with the button and the keyboard, and redoes it", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    const item = page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" });

    await item.click();
    await page.getByRole("button", { name: "Shown", exact: true }).click();
    await page.getByText("Unsaved changes").waitFor();
    expect(await item.count()).toBe(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await item.waitFor();
    // saved state again: nothing to save
    await page.getByText("Saved", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Redo" }).click();
    await item.waitFor({ state: "detached" });

    // keyboard, with focus on the page (not in a field)
    await page.locator("body").press("Control+z");
    await item.waitFor();
    await page.locator("body").press("Control+Shift+z");
    await item.waitFor({ state: "detached" });
    expect(await page.getByRole("button", { name: "Undo" }).isEnabled()).toBe(
      true
    );
  });
});
