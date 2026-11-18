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

describe("skills in grouped rows", () => {
  it("switches the layout in the template, shows the rows and the levels choice", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await page.getByText("Jane Doe").first().waitFor();
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Templates" })
      .click();
    await page
      .getByRole("navigation", { name: "Template sections" })
      .getByRole("link", { name: "Sections" })
      .click();
    await page.getByRole("button", { name: /^Edit Skills/i }).click();

    // the levels choice only exists in grouped rows; the skill icon works until then
    await page.getByLabel("Skills layout").waitFor();
    expect(await page.getByLabel("Levels in grouped rows").count()).toBe(0);
    await page
      .getByRole("group", { name: "Skills layout" })
      .getByRole("button", { name: "Grouped rows" })
      .click();
    await page.getByLabel("Levels in grouped rows").waitFor();
    await page
      .getByText("Skill Icon (not used in grouped rows)")
      .first()
      .waitFor();
    expect(
      await page
        .locator('[aria-disabled="true"]')
        .filter({ hasText: /Star|Circle|level/ })
        .count()
    ).toBeGreaterThan(0);

    // one row per group on the paper, skills joined with dots, no levels yet
    const paper = page
      .locator("[data-cv-section]")
      .filter({ hasText: "Languages" });
    await paper.getByText("English · French").waitFor();
    expect(await paper.innerText()).toContain("React · TypeScript");

    // All: levels are written after the skills
    await page
      .getByRole("group", { name: "Levels in grouped rows" })
      .getByRole("button", { name: "All" })
      .click();
    await paper.getByText("(Advanced)").first().waitFor();
  });
});
