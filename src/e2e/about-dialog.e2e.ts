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

async function openAbout(): Promise<void> {
  await page.goto(app.webUrl);
  const isPhone = (page.viewportSize()?.width ?? 0) < 600;
  if (isPhone) {
    // on a phone About is in the More menu of the top bar
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "About CV Builder and its author" })
      .click();
  } else {
    await page
      .getByRole("button", { name: "About CV Builder and its author" })
      .click();
  }
  await page.getByRole("dialog", { name: "About CV Builder" }).waitFor();
}

describe("About dialog", () => {
  it("loads the photo, shows the texts and opens the Privacy note", async () => {
    await openAbout();
    const dialog = page.getByRole("dialog", { name: "About CV Builder" });
    const photo = dialog.getByRole("img", { name: "Mohammad Amirshahi" });
    await photo.waitFor();
    // a broken image has no natural width: this proves /me-avatar.jpg is really served
    expect(
      await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)
    ).toBeGreaterThan(0);
    await dialog.getByText("Why I made this").waitFor();
    expect(await dialog.getByText("Write it once").count()).toBe(1);
    expect(await dialog.getByText("AI is optional and marked").count()).toBe(1);
    expect(
      await dialog.getByRole("button", { name: "How to use" }).count()
    ).toBe(0);

    await dialog.getByRole("button", { name: "Privacy note" }).click();
    await page.getByRole("heading", { name: "Privacy note" }).waitFor();
  });

  it("keeps the header and footer in view when the window is short", async () => {
    await page.setViewportSize({ width: 1280, height: 520 });
    await openAbout();
    const dialog = page.getByRole("dialog", { name: "About CV Builder" });
    await dialog.getByRole("button", { name: "Close" }).last().waitFor();
    const box = await dialog.boundingBox();
    const closeBox = await dialog
      .getByRole("button", { name: "Close" })
      .last()
      .boundingBox();
    expect(box).not.toBeNull();
    expect(closeBox).not.toBeNull();
    // the footer button is inside the window although the content is taller than it
    expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(520);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  it("is full screen on a phone and fits the width", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAbout();
    const dialog = page.getByRole("dialog", { name: "About CV Builder" });
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
    await page.setViewportSize({ width: 1280, height: 800 });
  });
});
