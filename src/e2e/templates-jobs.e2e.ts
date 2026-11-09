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

/** Font size in px of the first "Work Experience" section title on the paper */
async function sectionTitleSize(): Promise<number> {
  const title = page
    .locator("[data-cv-paper]")
    .getByText(/Work Experience/i)
    .first();
  await title.waitFor();
  return title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}

/** A tool of the left rail (the Vault page has a "Jobs" settings page of its own, so use the rail) */
async function openTool(name: "Vault" | "Jobs" | "Templates"): Promise<void> {
  await page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name })
    .click();
}

/** The job controls (job, name, template, page limit) are on the Jobs tool's "Job settings" view */
async function openJobSettings(): Promise<void> {
  await page.getByRole("link", { name: "Job settings" }).click();
  await page.getByLabel("Active job").waitFor();
}

async function openCvPage(): Promise<void> {
  await page.getByRole("link", { name: "CV page" }).click();
  await page.locator("[data-cv-paper]").waitFor();
}

/** Picks the job on the settings view and goes back to the page */
async function chooseJob(name: string): Promise<void> {
  await openJobSettings();
  await page.getByLabel("Active job").click();
  await page.getByRole("option", { name, exact: true }).click();
  await openCvPage();
}

/** Makes a job on the settings view; stays there */
async function newJob(name: string, templateOption?: string): Promise<void> {
  await openJobSettings();
  await page.getByRole("button", { name: "New job", exact: true }).click();
  await page.getByLabel("New job name").fill(name);
  if (templateOption) {
    await page.getByLabel("Template", { exact: true }).click();
    await page.getByRole("option", { name: templateOption }).click();
  }
  await page.getByRole("button", { name: "Create job" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

describe("templates and jobs in the browser", () => {
  it("two jobs share a template: hiding is per job, a style change reaches both", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    const firstSize = await sectionTitleSize();

    // Create a template on the Templates page
    await openTool("Templates");
    await page.getByLabel("New template name").fill("Template Two");
    await page.getByRole("button", { name: "Create template" }).click();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Template Two" })
      .waitFor();
    // the template the first job uses cannot be deleted
    expect(
      await page
        .getByRole("button", { name: "Delete template Template Two" })
        .isDisabled()
    ).toBe(false);

    // Two jobs on it: the first picks the template, the second shares it by default
    await openTool("Jobs");
    await newJob("Job A", "Template Two");
    await newJob("Job B");
    await page
      .getByLabel("Template of this job")
      .filter({ hasText: "Template Two" })
      .waitFor();
    await openCvPage();

    // Hide an item in Job B only
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .click();
    await page.getByRole("button", { name: "Shown", exact: true }).click();
    expect(
      await page
        .locator("[data-cv-item]")
        .filter({ hasText: "Sample Systems" })
        .count()
    ).toBe(0);

    // Job A still shows it
    await chooseJob("Job A");
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .first()
      .waitFor();

    // The inspector says what the page settings change
    await page.getByRole("button", { name: "Back to page settings" }).click();
    await page
      .getByText("Changes template “Template Two”, used by 2 jobs.")
      .waitFor();

    // Change a style in the template (Design): both jobs follow
    await openTool("Templates");
    await page.getByRole("link", { name: "Design", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Editing template" })
      .filter({ hasText: "Template Two (2 jobs)" })
      .waitFor();
    await page.getByLabel("Increase headingMd size").click();
    await openTool("Jobs");
    const sizeA = await sectionTitleSize();
    await chooseJob("Job B");
    const sizeB = await sectionTitleSize();
    expect(sizeA).toBeGreaterThan(firstSize);
    expect(sizeB).toBe(sizeA);

    // The first job is on its own template and did not change
    await chooseJob("Sample CV");
    expect(await sectionTitleSize()).toBe(firstSize);
  });

  it("keeps jobs, templates and sharing after saving and reloading", async () => {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("Jane Doe").first().waitFor();

    await openTool("Jobs");
    await chooseJob("Job B");
    await openJobSettings();
    await page
      .getByLabel("Template of this job")
      .filter({ hasText: "Template Two" })
      .waitFor();
    await openCvPage();
    expect(
      await page
        .locator("[data-cv-item]")
        .filter({ hasText: "Sample Systems" })
        .count()
    ).toBe(0);
    await chooseJob("Job A");
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .first()
      .waitFor();

    // a template jobs use can be deleted: the dialog says which jobs move and asks where to
    await openTool("Templates");
    const button = page.getByRole("button", {
      name: "Delete template Template Two",
    });
    await button.waitFor();
    expect(await button.isDisabled()).toBe(false);
    await button.click();
    await page.getByText(/2 jobs use it/).waitFor();
    await page.getByText("Move these jobs to").first().waitFor();
    await page.getByRole("button", { name: "Cancel" }).click();
  });
  it("Edit on a template card changes that template only, and the address keeps it", async () => {
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();
    const sizeBefore = await sectionTitleSize();

    // A template no job uses
    await openTool("Templates");
    await page.getByLabel("New template name").fill("Unused look");
    await page.getByRole("button", { name: "Create template" }).click();
    const card = page.getByRole("listitem").filter({ hasText: "Unused look" });
    await card.waitFor();

    // Edit opens Design of that template, with its id in the address
    await card.getByRole("link", { name: "Edit template Unused look" }).click();
    await page.waitForURL(/\/templates\/[^/]+\/design$/);
    const designUrl = page.url();
    await page
      .getByRole("combobox", { name: "Editing template" })
      .filter({ hasText: "Unused look" })
      .waitFor();

    // Change a style there
    await page.getByLabel("Increase headingMd size").click();
    expect(page.url()).toBe(designUrl);

    // The job being edited did not change
    await openTool("Jobs");
    expect(await sectionTitleSize()).toBe(sizeBefore);

    // The address survives a reload (the edit is saved first)
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.goto(designUrl);
    await page
      .getByRole("combobox", { name: "Editing template" })
      .filter({ hasText: "Unused look" })
      .waitFor();
  });
});
