import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { ChatResponse } from "@custom-types/chat-types";
import { RunningApp, startApp } from "@e2e/start-app";
import { stubAiRoute, sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;
const file = sampleFile();
const jobs = file.vault.sections.find((s) => s.type === "experience")!.items;

beforeAll(async () => {
  app = await startApp();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("chat edits (the AI's answers are stubbed)", () => {
  it("asks, approves, sees the page change, and undoes it", async () => {
    const answer: ChatResponse = {
      reply: "Hiding your earlier job and putting Skills first.",
      operations: [
        { op: "hideItem", itemId: jobs[1].id, isHidden: true },
        {
          op: "moveSection",
          sectionId: file.vault.sections.find((s) => s.type === "skills")!.id,
          position: 1,
        },
      ],
      warnings: [],
    };
    await page.route("**/api/ai/status", (route) =>
      route.fulfill({
        json: {
          isConfigured: true,
          provider: "ollama",
          providers: [
            {
              id: "ollama",
              label: "Ollama",
              isOnline: false,
              recipient: "this computer",
              detail: "",
              isConfigured: true,
            },
          ],
          choice: {
            tailor: "ollama",
            import: "ollama",
            hide: "ollama",
            chat: "ollama",
          },
        },
      })
    );
    let seen: unknown;
    await stubAiRoute(page, "**/api/ai/chat", answer, (body) => {
      seen = body;
    });

    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    const item = page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" });
    await item.waitFor();
    const sections = (): Promise<(string | null)[]> =>
      page
        .locator("[data-cv-section]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-cv-section"))
        );
    const before = await sections();

    // Chat is an assistant in the Apply menu
    await page
      .getByRole("navigation", { name: "Job application" })
      .getByRole("link", { name: /^Chat/ })
      .click();
    await page
      .getByLabel("Message")
      .fill("Hide the oldest job and put skills first");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText(answer.reply).waitFor();
    expect((seen as { message: string }).message).toBe(
      "Hide the oldest job and put skills first"
    );

    // nothing changes before approval
    expect(await item.count()).toBe(1);
    await page.getByRole("button", { name: "Apply 2 selected" }).click();
    await item.waitFor({ state: "detached" });
    const after = await sections();
    expect(after[0]).toBe("skills");
    await page.getByText("Unsaved changes").waitFor();

    // one undo takes back both changes
    await page
      .getByRole("button", { name: "Undo", exact: true })
      .first()
      .click();
    await item.waitFor();
    expect(await sections()).toEqual(before);
    await page.getByText("Saved", { exact: true }).waitFor();
  });
});
