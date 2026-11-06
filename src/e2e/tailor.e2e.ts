import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { TailorResult } from "@custom-types/tailor-types";
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

describe("tailor review: pins, diff and section moves (AI answers stubbed)", () => {
  it("puts numbered pins next to the changed items and links them to the list", async () => {
    const file = sampleFile();
    const jobs = file.vault.sections.find(
      (s) => s.type === "experience"
    )!.items;
    const sectionIds = file.vault.sections.map((s) => s.id);
    const result: TailorResult = {
      requirements: {
        jobTitle: "Dev",
        seniority: "",
        mustHave: [],
        niceToHave: [],
        keywords: [],
      },
      proposal: {
        items: jobs.map((job, index) => ({
          itemId: job.id,
          relevance: 0.9 - index * 0.3,
          isIncluded: true,
          isHighlighted: index === 0,
          reason: "r",
        })),
        bullets: [],
        sectionOrder: [...sectionIds].reverse(),
        sectionOrderReason: "Skills first",
        statement: "",
        statementFlags: [],
        gaps: [],
      },
      warnings: [],
    };
    await page.route("**/api/ai/status", (route) =>
      route.fulfill({ json: { isConfigured: true, provider: "ollama" } })
    );
    await page.route("**/api/ai/tailor", (route) =>
      route.fulfill({ json: result })
    );

    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Tailor", exact: true }).click();
    await page.getByLabel("Job advert").fill("A job");
    await page.getByRole("button", { name: "Analyse" }).click();
    await page.getByRole("button", { name: "Change 1", exact: true }).waitFor();

    // pin 1 sits at the height of the most relevant item on the paper
    const pin = await page
      .getByRole("button", { name: "Change 1", exact: true })
      .boundingBox();
    const item = await page
      .locator(`[data-cv-item="${jobs[0].id}"]`)
      .boundingBox();
    expect(pin).not.toBeNull();
    expect(item).not.toBeNull();
    expect(Math.abs(pin!.y - item!.y)).toBeLessThan(30);

    // clicking the number in the list highlights the item on the paper
    await page
      .getByRole("button", { name: "Show change 2 on the page" })
      .click();
    await page.waitForFunction((id) => {
      const element = document.querySelector(`[data-cv-item="${id}"]`);
      return (
        element !== null && getComputedStyle(element).outlineStyle === "solid"
      );
    }, jobs[2].id);

    // Diff lists the moved sections; declining the reorder removes them
    await page.getByRole("button", { name: "Diff" }).click();
    const diff = page.getByRole("region", { name: "Differences" });
    await diff.getByText("moved").first().waitFor();
    await page
      .getByRole("checkbox", { name: /Reorder the sections/ })
      .uncheck();
    await diff.getByText("moved").first().waitFor({ state: "detached" });
  });
});
