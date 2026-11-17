import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

/** Window sizes of issue #348: large desktop, desktop, small laptop, tablet and phone */
const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const PHONE_WIDTH = 390;

const PAGES = [
  "/vault",
  "/vault/experience",
  "/jobs/main?view=details",
  "/jobs/main?view=page",
  "/jobs/main?view=settings",
  "/chat/main",
  "/templates",
  "/templates/template-main/design",
  "/applications",
];

let app: RunningApp;
let browser: Browser;
let page: Page;
let applicationId = "";

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  const response = await fetch(`${app.apiUrl}/api/applications`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: "main",
      company: "Acme Ltd",
      role: "Frontend Engineer",
    }),
  });
  applicationId = ((await response.json()) as { id: string }).id;
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

async function open(path: string): Promise<void> {
  await page.goto(`${app.webUrl}${path}`);
  await page.getByRole("navigation", { name: "Tools" }).waitFor();
  // let the data load and the layout settle
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

/** How far the page is scrolled sideways (the window must never be) */
async function pageOverflow(): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
}

/**
 * Visible controls that lie outside the window sideways and are not inside a box the user
 * can scroll (so they cannot be reached).
 */
async function unreachableControls(): Promise<string[]> {
  return page.evaluate(() => {
    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';
    const lost: string[] = [];
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        box.width === 0 ||
        box.height === 0 ||
        style.visibility === "hidden" ||
        style.display === "none" ||
        element.closest("[aria-hidden='true']")
      ) {
        continue;
      }
      if (box.right <= window.innerWidth + 1 && box.left >= -1) {
        continue;
      }
      let isScrollable = false;
      for (
        let parent = element.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === "auto" || overflowX === "scroll") {
          isScrollable = true;
          break;
        }
      }
      if (!isScrollable) {
        lost.push(
          element.getAttribute("aria-label") ??
            (element.textContent ?? "").trim().slice(0, 40) ??
            element.tagName
        );
      }
    }
    return lost;
  });
}

describe("no sideways page scroll and no unreachable controls", () => {
  for (const { width, height } of SIZES) {
    it(`at ${width}x${height}`, async () => {
      await page.setViewportSize({ width, height });
      for (const path of [...PAGES, `/applications/${applicationId}`]) {
        await open(path);
        expect(await pageOverflow(), `${path} at ${width}`).toBeLessThanOrEqual(
          0
        );
        expect(await unreachableControls(), `${path} at ${width}`).toEqual([]);
      }
    });
  }
});

describe("navigation follows the size", () => {
  it("is a left rail on a desktop and a bottom bar on a phone", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/vault");
    const rail = await page
      .getByRole("navigation", { name: "Tools" })
      .boundingBox();
    expect(rail?.x).toBe(0);
    expect(rail?.height).toBeGreaterThan(500);

    await page.setViewportSize({ width: PHONE_WIDTH, height: 844 });
    await open("/vault");
    const bar = await page
      .getByRole("navigation", { name: "Tools" })
      .boundingBox();
    expect(bar?.width).toBe(PHONE_WIDTH);
    expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeGreaterThan(843);
    for (const name of ["Vault", "Templates", "Apply", "Applications"]) {
      const link = page
        .getByRole("navigation", { name: "Tools" })
        .getByRole("link", { name });
      await expect(link.isVisible()).resolves.toBe(true);
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });

  it("opens every tool on a phone through the bottom bar", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open("/vault");
    const tools = page.getByRole("navigation", { name: "Tools" });
    await tools.getByRole("link", { name: "Templates" }).click();
    await page.waitForURL(/\/templates/);
    await tools.getByRole("link", { name: "Applications" }).click();
    await page.waitForURL(/\/applications/);
    await tools.getByRole("link", { name: "Apply" }).click();
    await page.waitForURL(/\/jobs/);
    await tools.getByRole("link", { name: "Vault" }).click();
    await page.waitForURL(/\/vault/);
  });
});

describe("the CV paper does not depend on the window size", () => {
  it("has the same layout size at every width", async () => {
    const sizes: { width: number; height: number }[] = [];
    for (const { width, height } of SIZES) {
      await page.setViewportSize({ width, height });
      await open("/jobs/main?view=page");
      const paper = page.locator("[data-cv-paper]");
      await paper.waitFor();
      sizes.push(
        await paper.evaluate((el) => ({
          width: (el as HTMLElement).offsetWidth,
          height: (el as HTMLElement).offsetHeight,
        }))
      );
    }
    for (const size of sizes) {
      expect(size).toEqual(sizes[0]);
    }
  });
});
