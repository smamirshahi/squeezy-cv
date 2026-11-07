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
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

async function openTool(name: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name })
    .click();
}

/** The panel and its resize handle start where the top bar ends and reach the window bottom */
async function expectFullHeight(
  label: string,
  handle: string,
  role: "complementary" | "navigation" = "complementary"
): Promise<void> {
  const panel = page.getByRole(role, { name: label });
  await panel.waitFor();
  const box = await panel.boundingBox();
  const grip = await page
    .getByRole("separator", { name: handle })
    .boundingBox();
  const windowHeight = page.viewportSize()?.height ?? 0;
  expect(box).not.toBeNull();
  expect(
    Math.abs((box?.y ?? 0) + (box?.height ?? 0) - windowHeight)
  ).toBeLessThan(2);
  expect(
    Math.abs((grip?.y ?? 0) + (grip?.height ?? 0) - windowHeight)
  ).toBeLessThan(2);
  expect(Math.abs((grip?.y ?? 0) - (box?.y ?? 0))).toBeLessThan(2);
  // The page itself does not scroll
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    )
  ).toBeLessThanOrEqual(0);
}

describe("sidebars fill the window height", () => {
  it("Vault with nothing selected: tree and right panel", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await openTool("Vault");
    await expectFullHeight("Vault tree", "Resize the vault tree");
    await expectFullHeight("Appears in", "Resize the item panel");
  });

  it("Jobs: the inspector", async () => {
    await openTool("Jobs");
    await expectFullHeight("Inspector", "Resize the inspector");
  });

  it("Templates: the menu and the sample CV panel", async () => {
    await openTool("Templates");
    await expectFullHeight(
      "Template sections",
      "Resize the template menu",
      "navigation"
    );
    await expectFullHeight("Sample CV panel", "Resize the sample CV");
  });

  it("Chat: the chat panel", async () => {
    await openTool("Chat");
    await expectFullHeight("Chat", "Resize the chat panel");
  });

  it("stays full height in a short window", async () => {
    await page.setViewportSize({ width: 1280, height: 420 });
    await openTool("Vault");
    await expectFullHeight("Vault tree", "Resize the vault tree");
    await expectFullHeight("Appears in", "Resize the item panel");
  });
});
