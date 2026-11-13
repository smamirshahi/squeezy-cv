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
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("Profile picture dialog", () => {
  it("shows the placeholder and 'Add image' when empty, then 'Change image' with a picture", async () => {
    await page.goto(app.webUrl);
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Vault" })
      .click();
    await page.getByRole("link", { name: "Main Info" }).click();
    await page.getByRole("button", { name: "Add photo" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Profile picture" });
    const frame = dialog.getByRole("group", { name: /^Photo frame/ });
    await frame.locator('[data-testid="PersonOutlinedIcon"]').waitFor();
    expect(await dialog.getByText("Add image").count()).toBe(1);
    expect(await dialog.getByText("Change image").count()).toBe(0);

    // A real picture (a 1x1 PNG) replaces the placeholder and the button says Change image
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    await dialog.getByLabel("Photo file").setInputFiles({
      name: "me.png",
      mimeType: "image/png",
      buffer: png,
    });
    await dialog.getByAltText("Photo being adjusted").waitFor();
    expect(await dialog.getByText("Change image").count()).toBe(1);
    expect(
      await frame.locator('[data-testid="PersonOutlinedIcon"]').count()
    ).toBe(0);

    // Removing it brings the placeholder and Add image back
    await dialog.getByRole("button", { name: "Remove image" }).click();
    await frame.locator('[data-testid="PersonOutlinedIcon"]').waitFor();
    expect(await dialog.getByText("Add image").count()).toBe(1);
  });
});
