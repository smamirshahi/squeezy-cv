import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
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
  // The other tutorials are not what this test is about; the AI one must still open by itself
  await skipTutorials(page);
  await page.addInitScript(() => {
    localStorage.removeItem("squeezy-cv-ai-tutorial-seen");
  });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("the AI tutorial (#504)", () => {
  it("opens the first time the AI settings are opened from the rail, and not again", async () => {
    await page.goto(`${app.webUrl}/vault`);
    await page.getByRole("button", { name: "Settings" }).first().click();
    const dialog = page.getByRole("dialog", {
      name: "AI is a helper, not the author",
    });
    await dialog.waitFor();
    await dialog.getByText("Using AI safely · Step 1 of 8").waitFor();
    await dialog.getByRole("button", { name: "Close" }).click();
    await dialog.waitFor({ state: "hidden" });

    await page
      .locator('[aria-labelledby="ai-settings-title"]')
      .getByLabel("Close")
      .click();
    await page.getByRole("button", { name: "Settings" }).first().click();
    await page.locator('[aria-labelledby="ai-settings-title"]').waitFor();
    expect(
      await page
        .getByRole("dialog", { name: "AI is a helper, not the author" })
        .count()
    ).toBe(0);
  });

  it("opens again from How AI is used", async () => {
    await page.getByRole("button", { name: "How AI is used" }).click();
    await page
      .getByRole("dialog", { name: "AI is a helper, not the author" })
      .waitFor();
  });
});
