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

describe("the Applications tutorial", () => {
  it("opens the first time the Applications page is visited, and not again", async () => {
    await page.goto(`${app.webUrl}/applications`);
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByText("Your applications · Step 1 of 4").waitFor();
    await dialog.getByRole("button", { name: "Next" }).click();
    expect(
      await dialog
        .getByRole("heading", { name: "How does a job move forward?" })
        .count()
    ).toBe(1);
    await dialog.getByRole("button", { name: "Close" }).click();
    await dialog.waitFor({ state: "hidden" });

    await page.reload();
    await page.getByRole("heading", { name: "Applications" }).first().waitFor();
    expect(await page.getByRole("dialog").count()).toBe(0);
  });

  it("is in the list opened by the question mark in the top bar", async () => {
    await page.getByRole("button", { name: "Tutorials" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Your applications/ }).click();
    expect(
      await dialog
        .getByRole("heading", { name: "Where does each job stand?" })
        .count()
    ).toBe(1);
  });
});
