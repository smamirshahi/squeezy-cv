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
  page = await browser.newPage();
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("overflow and hiding to fit (measured in a real browser)", () => {
  it("says how many lines are over, then hides the chosen items until it fits", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await page.getByText("Jane Doe").first().waitFor();

    // The banner says how far over it is
    const banner = page.getByText(/lines? (is|are) over; page 2 starts at/);
    await banner.waitFor();
    // and so does the General step of the content panel
    await page.getByText(/^Over by \d+ lines?$/).waitFor();

    // The panel lists the least relevant items with the lines each saves; tick some, then hide
    await page.getByRole("button", { name: "Choose items to hide" }).click();
    const hide = page.getByRole("button", { name: /^Hide selected/ });
    expect(await hide.isDisabled()).toBe(true);
    const boxes = page.getByRole("checkbox", { name: /^Hide / });
    await boxes.first().waitFor();
    const count = Math.min(await boxes.count(), EXTRA_JOBS);
    for (let index = 0; index < count; index += 1) {
      await boxes.nth(index).check();
    }
    expect(await hide.isDisabled()).toBe(false);
    await hide.click();
    await banner.waitFor({ state: "detached" });

    // Items were hidden in the job only: the vault still has every one of them
    const vault = await (
      await page.request.get(`${app.webUrl}/api/vault`)
    ).text();
    for (let n = 1; n <= EXTRA_JOBS; n += 1) {
      expect(vault).toContain(`Engineer Number ${n}`);
    }
    const job = await (
      await page.request.get(`${app.webUrl}/api/jobs/main`)
    ).text();
    expect(job).toContain('"isVisible":false');
  });
});
