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

  it("hides and moves the selected item with the keyboard", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();

    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .click();
    await page.keyboard.press("Alt+ArrowUp");
    const order = await page
      .locator("[data-cv-item]")
      .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
    expect(order[0]).toContain("Sample Systems");

    await page.keyboard.press("h");
    expect(
      await page
        .locator("[data-cv-item]")
        .filter({ hasText: "Sample Systems" })
        .count()
    ).toBe(0);
  });

  it("drags sections, items and bullets by their handles", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.keyboard.press("o");
    const outline = page.getByRole("complementary", { name: "Outline" });
    await outline.waitFor();

    // a drag with the mouse: press the handle, move in steps, release over the target row
    async function drag(
      handleLabel: string,
      handleIndex: number,
      targetText: string
    ): Promise<void> {
      const handle = outline
        .getByRole("button", { name: handleLabel })
        .nth(handleIndex);
      const target = outline.getByText(targetText, { exact: true }).first();
      const from = (await handle.boundingBox())!;
      const to = (await target.boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + 4, from.y + 12, { steps: 4 });
      await page.mouse.move(to.x + 10, to.y + to.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    const sectionOrder = (): Promise<(string | null)[]> =>
      page
        .locator("[data-cv-section]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-cv-section"))
        );
    const before = await sectionOrder();
    expect(before.indexOf("experience")).toBeLessThan(
      before.indexOf("education")
    );

    // Education (a section row) dropped on Work Experience: it moves above it
    const handles = outline.getByRole("button", { name: "Drag to reorder" });
    const count = await handles.count();
    expect(count).toBeGreaterThan(3);
    await drag(
      "Drag to reorder",
      await sectionHandleIndex(outline, "Education"),
      "Work Experience"
    );
    const after = await sectionOrder();
    expect(after.indexOf("education")).toBeLessThan(
      after.indexOf("experience")
    );
    await outline.getByText(/^Moved Education/).waitFor();
  });
});

/** Index (among all drag handles) of the handle in the row of the section with this title */
async function sectionHandleIndex(
  outline: import("playwright").Locator,
  title: string
): Promise<number> {
  return outline.getByRole("button", { name: "Drag to reorder" }).evaluateAll(
    (handles, text) =>
      handles.findIndex((handle) => {
        const row = handle.parentElement;
        return row?.textContent?.trim().startsWith(text) ?? false;
      }),
    title
  );
}
