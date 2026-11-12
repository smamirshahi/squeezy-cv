import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  await app.seedJobs(sampleFile(), [], []);
  browser = await chromium.launch();
  // a short window: the form does not fit
  page = await browser.newPage({ viewport: { width: 1280, height: 520 } });
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("the Save for later dialog in a short window", () => {
  it("scrolls its content and shows a scrollbar that stays visible", async () => {
    await page.goto(`${app.webUrl}/applications`);
    await page.getByRole("button", { name: "Save for later" }).click();
    const dialog = page.getByRole("dialog", { name: "Save for later" });
    await dialog.waitFor();
    const result = await dialog.evaluate((element) => {
      const content = element.querySelector(
        ".MuiDialogContent-root"
      ) as HTMLElement;
      return {
        scrolls:
          content.scrollHeight > content.clientHeight &&
          getComputedStyle(content).overflowY === "auto",
        // a styled scrollbar is always drawn, also where the system hides its own until you scroll
        scrollbarWidth: getComputedStyle(content, "::-webkit-scrollbar").width,
      };
    });
    expect(result.scrolls).toBe(true);
    expect(result.scrollbarWidth).toBe("12px");
    // the last field can be reached by scrolling
    await dialog.getByLabel("Advert text (optional)").scrollIntoViewIfNeeded();
    expect(await dialog.getByLabel("Advert text (optional)").isVisible()).toBe(
      true
    );
  });
});
