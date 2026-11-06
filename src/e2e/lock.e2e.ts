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

describe("a variant that was sent is locked", () => {
  it("locks after Mark as applied, and edits only after an approved unlock", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Mark as applied" }).click();
    await page.getByRole("textbox", { name: /^Company/ }).fill("Acme Ltd");
    await page.getByRole("textbox", { name: /^Role/ }).fill("Senior Dev");
    await page.getByRole("button", { name: "Save application" }).click();
    await page.getByText("Saved: Acme Ltd, Senior Dev").waitFor();

    // locked: banner, and the inspector's controls are disabled
    await page.getByText(/locked because it was sent/).waitFor();
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .click();
    expect(
      await page
        .getByRole("button", { name: "Shown", exact: true })
        .isDisabled()
    ).toBe(true);

    // unlock needs a confirmation; cancelling keeps the lock
    await page.getByRole("button", { name: "Unlock to edit" }).click();
    await page.getByText(/Unlocking lets you change/).waitFor();
    await page.getByRole("button", { name: "Cancel" }).click();
    expect(
      await page
        .getByRole("button", { name: "Shown", exact: true })
        .isDisabled()
    ).toBe(true);

    await page.getByRole("button", { name: "Unlock to edit" }).click();
    await page.getByRole("button", { name: "Unlock anyway" }).click();
    await page.getByText(/Unlocked for editing/).waitFor();
    await page.getByRole("button", { name: "Shown", exact: true }).click();
    await page.getByText("Unsaved changes").waitFor();

    // saving works (the server gets ?unlock=true) and the variant is locked again
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.getByText(/locked because it was sent/).waitFor();
  });

  it("stays locked after a reload, and the server refuses a plain write", async () => {
    await page.reload();
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText(/locked because it was sent/).waitFor();
    const response = await page.request.put(`${app.webUrl}/api/variants/main`, {
      data: { not: "even a variant" },
    });
    expect(response.status()).toBe(400);
    const variant = await (
      await page.request.get(`${app.webUrl}/api/variants/main`)
    ).json();
    const refused = await page.request.put(`${app.webUrl}/api/variants/main`, {
      data: variant,
    });
    expect(refused.status()).toBe(409);
  });
});
