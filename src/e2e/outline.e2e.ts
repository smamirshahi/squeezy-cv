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

describe("the outline", () => {
  it("opens with O, hides and moves things, and the page follows", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await page.getByText("Jane Doe").first().waitFor();

    await page.keyboard.press("o");
    const outline = page.getByRole("complementary", { name: "Outline" });
    await outline.waitFor();

    const itemOrder = (): Promise<string[]> =>
      page
        .locator("[data-cv-item]")
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));

    // move the older job above the newer one; the page follows
    await outline
      .getByRole("button", { name: "Move Software Developer up" })
      .click();
    const moved = await itemOrder();
    expect(moved.findIndex((t) => t.includes("Sample Systems"))).toBeLessThan(
      moved.findIndex((t) => t.includes("Example Ltd"))
    );
    await outline.getByText(/^Moved Software Developer to position/).waitFor();

    // hide it from the outline: it leaves the page
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

    // sections keep the order of the template: the outline has no move buttons for them
    expect(
      await outline.getByRole("button", { name: "Move Education up" }).count()
    ).toBe(0);
  });

  it("hides and moves the selected item with the keyboard", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
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

  it("drags an item by its handle and the page follows", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
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
      await page.mouse.move(from.x + 4, from.y - 12, { steps: 4 });
      await page.mouse.move(to.x + 10, to.y + 2, { steps: 12 });
      await page.mouse.up();
    }
    const itemOrder = (): Promise<string[]> =>
      page
        .locator("[data-cv-item]")
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
    const index = (order: string[], text: string): number =>
      order.findIndex((t) => t.includes(text));
    const before = await itemOrder();
    expect(index(before, "Example Ltd")).toBeLessThan(
      index(before, "Sample Systems")
    );

    // the older job dropped on the newer one: it moves above it
    await drag(
      "Drag to reorder",
      await handleIndexOf(outline, "Software Developer"),
      "Senior Software Developer"
    );
    const after = await itemOrder();
    expect(index(after, "Sample Systems")).toBeLessThan(
      index(after, "Example Ltd")
    );
    await outline.getByText(/^Moved Software Developer/).waitFor();
  });
});

/** Index (among all drag handles) of the handle in the row that starts with this text */
async function handleIndexOf(
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
