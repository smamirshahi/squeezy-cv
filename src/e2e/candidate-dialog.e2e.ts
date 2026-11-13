import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;

beforeAll(async () => {
  app = await startApp();
  await app.seedJobs(sampleFile(), [], []);
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

const LONG_ADVERT = Array.from(
  { length: 60 },
  (_, line) => `Line ${line} of a long pasted advert about maritime software`
).join("\n");

/** Opens the dialog with a company and a long pasted advert in a window of the given size */
async function open(
  width: number,
  height: number
): Promise<{ page: Page; dialog: ReturnType<Page["getByRole"]> }> {
  const page = await browser.newPage({ viewport: { width, height } });
  await skipTutorials(page);
  await page.goto(`${app.webUrl}/applications`);
  await page.getByRole("button", { name: "Save for later" }).click();
  const dialog = page.getByRole("dialog", { name: "Save for later" });
  await dialog.waitFor();
  await dialog.getByLabel("Company").fill("Ocean Technologies Group");
  await dialog.getByLabel("Advert text (optional)").fill(LONG_ADVERT);
  return { page, dialog };
}

describe("the Save for later dialog", () => {
  it("fits the window with a long advert, Save included, and does not clip the first label", async () => {
    const { page, dialog } = await open(1280, 800);
    const result = await dialog.evaluate((element) => {
      const paper = element.closest(".MuiDialog-paper") as HTMLElement;
      const content = element.querySelector(
        ".MuiDialogContent-root"
      ) as HTMLElement;
      const save = [...element.querySelectorAll("button")].find(
        (button) => button.textContent === "Save"
      ) as HTMLElement;
      const label = element.querySelector("label") as HTMLElement;
      return {
        viewport: window.innerHeight,
        paperTop: paper.getBoundingClientRect().top,
        paperBottom: paper.getBoundingClientRect().bottom,
        saveBottom: save.getBoundingClientRect().bottom,
        labelGap:
          label.getBoundingClientRect().top -
          content.getBoundingClientRect().top,
      };
    });
    expect(result.paperTop).toBeGreaterThanOrEqual(0);
    expect(result.paperBottom).toBeLessThanOrEqual(result.viewport);
    expect(result.saveBottom).toBeLessThanOrEqual(result.viewport);
    // the label sticks out above its field: it needs room above it inside the scrolling content
    expect(result.labelGap).toBeGreaterThanOrEqual(0);
    await page.close();
  });

  it("puts Company and Role on one row when wide, and stacks them on a phone", async () => {
    const wide = await open(1280, 800);
    const topOf = (page: Page, label: string): Promise<number> =>
      page
        .getByRole("dialog", { name: "Save for later" })
        .getByLabel(label)
        .evaluate((input) => input.getBoundingClientRect().top);
    expect(await topOf(wide.page, "Company")).toBe(
      await topOf(wide.page, "Role")
    );
    await wide.page.close();
    const phone = await open(390, 844);
    expect(await topOf(phone.page, "Role")).toBeGreaterThan(
      await topOf(phone.page, "Company")
    );
    await phone.page.close();
  });

  it("scrolls its content in a short window and shows a scrollbar that stays visible", async () => {
    const { page, dialog } = await open(1280, 420);
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
    await dialog.getByLabel("Note").scrollIntoViewIfNeeded();
    expect(await dialog.getByLabel("Note").isVisible()).toBe(true);
    await page.close();
  });
});
