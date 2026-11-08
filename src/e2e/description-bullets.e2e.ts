import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFileWithBullets } from "@fixtures/sample-with-bullets";
import { readPdf } from "@e2e/read-pdf";

let app: RunningApp;
let browser: Browser;
let page: Page;

// the vault still has bullets on this item, so we can see them replaced in the job
const file = sampleFileWithBullets();
const experience = file.vault.sections.find((s) => s.type === "experience")!;
const target = experience.items[0];
target.fields.description = "Ran the platform team.\nCut deploy time.";
const vaultBulletText = target.bullets[0].text;

beforeAll(async () => {
  app = await startApp();
  await app.seed(file, [createDefaultVariant(file, "main")]);
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

describe("bullets made from the description (AI answer stubbed)", () => {
  it("shows the description, replaces the bullets in this job after review, saves, and the PDF has them", async () => {
    await page.route("**/api/ai/status", (route) =>
      route.fulfill({ json: { isConfigured: true, provider: "ollama" } })
    );
    await page.route("**/api/ai/bullets", (route) =>
      route.fulfill({
        json: {
          itemId: target.id,
          bullets: [
            { text: "Led the platform team", flags: [] },
            { text: "Cut deploy time by 97%", flags: ["number 97"] },
          ],
        },
      })
    );
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();

    // the description is on the page, before the vault bullets
    await page.getByText("Ran the platform team.").first().waitFor();
    await page.getByText(vaultBulletText).first().waitFor();

    await page.locator(`[data-cv-item="${target.id}"]`).click();
    await page.getByRole("button", { name: "Make bullets" }).click();
    await page.getByText("Led the platform team").first().waitFor();
    // the flagged one starts unticked; nothing changed yet
    const boxes = page
      .getByRole("group", { name: "Proposed bullets" })
      .getByRole("checkbox");
    expect(await boxes.nth(0).isChecked()).toBe(true);
    expect(await boxes.nth(1).isChecked()).toBe(false);
    expect(await page.getByText(vaultBulletText).count()).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Use these bullets" }).click();
    await page
      .locator(`[data-cv-item="${target.id}"]`)
      .getByText("Led the platform team")
      .waitFor();
    expect(
      await page
        .locator(`[data-cv-item="${target.id}"]`)
        .getByText(vaultBulletText)
        .count()
    ).toBe(0);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.reload();
    await page
      .locator(`[data-cv-item="${target.id}"]`)
      .getByText("Led the platform team")
      .waitFor();

    const pdf = await readPdf(await app.pdf("main"));
    expect(pdf.text).toContain("Led the platform team");
    expect(pdf.text).not.toContain(vaultBulletText);
  });
});
