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

describe("the outline", () => {
  it("opens with O, hides and moves things, and the page follows", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();

    await page.keyboard.press("o");
    const outline = page.getByRole("complementary", { name: "Outline" });
    await outline.waitFor();

    // hide the older job from the outline: it leaves the page
    await outline
      .getByRole("button", { name: "Hide Software Developer" })
      .click();
    await page.getByText("Unsaved changes").waitFor();
    expect(
      await page
        .locator("[data-cv-item]")
        .filter({ hasText: "Sample Systems" })
        .count()
    ).toBe(0);

    // move Education above Work Experience and hear about it
    await outline.getByRole("button", { name: "Move Education up" }).click();
    const text = await page
      .locator("[data-cv-section]")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-cv-section"))
      );
    expect(text.indexOf("education")).toBeLessThan(text.indexOf("experience"));
    await outline.getByText("Moved Education up.").waitFor();
  });
});
