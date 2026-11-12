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
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await skipTutorials(page);
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
  // a panel that was just opened can still be settling for a moment
  await expect.poll(() => panel.boundingBox()).not.toBeNull();
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
    await expectFullHeight("Item panel", "Resize the item panel");
  });

  it("Apply: the job menu and the content panel", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await expectFullHeight(
      "Job application",
      "Resize the job menu",
      "navigation"
    );
    await expectFullHeight("Content", "Resize the content panel");
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
    await page.goto(`${app.webUrl}/chat/main`);
    await page.getByText("Ask for changes. You approve each one.").waitFor();
    await expectFullHeight("Chat", "Resize the chat panel");
  });

  it("Applications: the status list and the side panel", async () => {
    await openTool("Applications");
    await expectFullHeight(
      "Filter by status",
      "Resize the status list",
      "navigation"
    );
    // a job that was not sent opens in the side panel
    await page.getByRole("row").nth(1).getByRole("cell").nth(1).click();
    await expectFullHeight(
      "Application detail",
      "Resize the application panel"
    );
  });

  it("stays full height in a short window", async () => {
    await page.setViewportSize({ width: 1280, height: 420 });
    await openTool("Vault");
    await expectFullHeight("Vault tree", "Resize the vault tree");
    await expectFullHeight("Item panel", "Resize the item panel");
  });
});
