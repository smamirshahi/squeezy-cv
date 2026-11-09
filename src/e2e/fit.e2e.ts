import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { longFile } from "@e2e/fixtures";

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
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("overflow and hiding to fit (measured in a real browser)", () => {
  it("says how many lines are over, then hides the least relevant items until it fits", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();

    // The banner says how far over it is
    await page.getByText(/lines? (is|are) over; page 2 starts at/).waitFor();

    // The inspector offers the least relevant items and a one-click fix
    await page
      .getByRole("button", { name: "Hide the least relevant until it fits" })
      .click();
    await page
      .getByText(/lines? (is|are) over; page 2 starts at/)
      .waitFor({ state: "detached" });
    expect(
      await page.getByText(/lines? (is|are) over; page 2 starts at/).count()
    ).toBe(0);

    // Items were hidden in the variant only: the vault still has them (they are listed, ticked)
    expect(
      await page.getByRole("checkbox", { checked: true }).count()
    ).toBeGreaterThan(0);
  });
});
