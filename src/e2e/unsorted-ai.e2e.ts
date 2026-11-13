import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

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

describe("Unsorted section with AI placement (the AI's answer is stubbed)", () => {
  it("is open to click when empty, and its AI card has Change AI and the ask button", async () => {
    await openVault();
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    expect(await tree.getByText("AI sorting").count()).toBe(0);
    await tree.getByText("Unsorted").click();

    const card = page.getByRole("region", {
      name: "Ask AI where these belong",
    });
    await card.getByText("Ollama · on this computer").waitFor();
    // Nothing to place yet, so asking is not possible
    expect(
      await card
        .getByRole("button", { name: "Ask AI where these belong" })
        .isDisabled()
    ).toBe(true);
    await card.getByRole("button", { name: "Change AI" }).click();
    await page.locator('[aria-labelledby="ai-settings-title"]').waitFor();
  });
});
