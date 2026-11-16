import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { longFile, skipTutorials } from "@e2e/fixtures";

const EXTRA_JOBS = 8;

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = longFile(EXTRA_JOBS);
  const variant = createDefaultVariant(file, "main");
  variant.pageLimit = 1;
  await app.seed(file, [variant]);
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("canvas zoom and Tab between blocks (real browser)", () => {
  it("zooms the page without changing what is measured", async () => {
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();
    // the overflow banner under the page says how far over it is
    const chip = page.getByText(/\d+ lines? (is|are) over; page 2 starts at/);
    await chip.waitFor();
    const before = await chip.innerText();
    const paper = page.locator("[data-cv-paper]");
    const widthAt100 = (await paper.boundingBox())!.width;

    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page
      .getByRole("button", { name: "Reset zoom" })
      .filter({ hasText: "80%" })
      .waitFor();
    const widthAt80 = (await paper.boundingBox())!.width;
    expect(widthAt80 / widthAt100).toBeCloseTo(0.8, 1);

    // keyboard: - then +
    await page.keyboard.press("-");
    await page
      .getByRole("button", { name: "Reset zoom" })
      .filter({ hasText: "70%" })
      .waitFor();
    await page.keyboard.press("0");
    await page
      .getByRole("button", { name: "Reset zoom" })
      .filter({ hasText: "100%" })
      .waitFor();

    // the same number of lines over at 60% as at 100%
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press("-");
    }
    await page
      .getByRole("button", { name: "Reset zoom" })
      .filter({ hasText: "60%" })
      .waitFor();
    await page.waitForTimeout(300);
    expect(await chip.innerText()).toBe(before);

    // Fit width makes the page about as wide as the canvas
    await page.getByRole("button", { name: "Fit width" }).click();
    const canvas = (await page
      .getByRole("main", { name: "Canvas" })
      .boundingBox())!;
    const fitted = (await paper.boundingBox())!.width;
    expect(fitted).toBeLessThanOrEqual(canvas.width);
    await page.keyboard.press("0");
  });

  it("Tab selects the next block, Shift+Tab the previous, and lets go at the ends", async () => {
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();
    await page.locator("[data-cv-paper]").focus();
    const selected = async (): Promise<string | null> =>
      page.evaluate(() => {
        const outlined = Array.from(
          document.querySelectorAll<HTMLElement>("[data-cv-item]")
        ).find((el) => getComputedStyle(el).outlineStyle === "solid");
        return outlined?.dataset.cvItem ?? null;
      });
    expect(await selected()).toBeNull();
    await page.keyboard.press("Tab");
    const first = await selected();
    expect(first).not.toBeNull();
    await page.keyboard.press("Tab");
    const second = await selected();
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    await page.keyboard.press("Shift+Tab");
    expect(await selected()).toBe(first);
    // at the first block Shift+Tab leaves the page instead of trapping the keyboard
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() =>
        document.activeElement?.hasAttribute("data-cv-paper")
      )
    ).toBe(false);
  });

  it("the block toolbar floats beside the selected item and follows the zoom", async () => {
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();
    const toolbar = page.getByRole("toolbar", { name: "Selected block" });
    expect(await toolbar.count()).toBe(0);

    await page.locator("[data-cv-paper]").focus();
    await page.keyboard.press("Tab");
    await toolbar.waitFor();
    const paper = (await page.locator("[data-cv-paper]").boundingBox())!;
    const item = (await page
      .locator("[data-cv-paper] [data-cv-item]")
      .first()
      .boundingBox())!;
    const box = (await toolbar.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(paper.x + paper.width);
    expect(Math.abs(box.y - item.y)).toBeLessThan(2);

    // zooming out keeps it beside the paper
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.waitForTimeout(200);
    const paper2 = (await page.locator("[data-cv-paper]").boundingBox())!;
    const box2 = (await toolbar.boundingBox())!;
    expect(box2.x).toBeGreaterThanOrEqual(paper2.x + paper2.width);
    await page.keyboard.press("0");

    // the button does what H does
    await toolbar.getByRole("button", { name: "Hide block" }).click();
    await toolbar.getByRole("button", { name: "Show block" }).waitFor();
  });
});
