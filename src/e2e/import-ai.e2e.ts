import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials, stubAiRoute } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;
const file = sampleFile();

const OLLAMA = {
  id: "ollama",
  label: "Ollama",
  isOnline: false,
  recipient: "this computer",
  detail: "",
  isConfigured: true,
};

beforeAll(async () => {
  app = await startApp();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      json: {
        isConfigured: true,
        provider: "ollama",
        providers: [OLLAMA],
        choice: { import: "ollama", place: "ollama" },
      },
    })
  );
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

async function openVault(): Promise<void> {
  await page.goto(app.webUrl);
  await page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name: "Vault" })
    .click();
}

describe("AI import dialog (the AI's answer is stubbed)", () => {
  it("has an enabled purple button, an AI card with Change AI, and adds what the AI found", async () => {
    await openVault();
    const button = page.getByRole("button", {
      name: "Paste CV text, AI sorts it",
    });
    expect(await button.isEnabled()).toBe(true);

    const imported = {
      ...file.vault,
      profile: { ...file.vault.profile, fullName: "Alex Morgan" },
    };
    await stubAiRoute(page, "**/api/ai/import", {
      vault: imported,
      warnings: [],
    });
    await button.click();

    const card = page.getByRole("region", {
      name: "AI for sorting the CV text",
    });
    await card.getByText("Ollama · on this computer").waitFor();

    // Change AI opens the AI settings on this task
    await card.getByRole("button", { name: "Change AI" }).click();
    const settings = page.locator('[aria-labelledby="ai-settings-title"]');
    await settings.waitFor();
    await settings.getByLabel("Close").click();
    await settings.waitFor({ state: "detached" });

    await page
      .getByRole("textbox", { name: "Your CV text" })
      .fill("Alex Morgan, developer");
    await page.getByRole("button", { name: "Analyze with AI" }).click();
    await page.getByText("Found: Alex Morgan").waitFor();
    await page.getByRole("button", { name: "Add to my vault" }).click();
    await page.getByRole("button", { name: "Add to my vault" }).waitFor({
      state: "detached",
    });
  });
});
