import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { splitVariant } from "@shared/variant/template-job";
import { RunningApp, startApp } from "@e2e/start-app";
import { openCvPage, sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  const file = sampleFile();
  // Three jobs on two templates: "main" has a template of its own, Job A and Job B share one
  const first = splitVariant(
    createDefaultVariant(file, "main"),
    "template-main"
  );
  const second = {
    ...first.template,
    id: "template-two",
    name: "Template Two",
  };
  await app.seedJobs(
    file,
    [first.template, second],
    [
      first.job,
      { ...first.job, id: "job-a", name: "Job A", templateId: second.id },
      { ...first.job, id: "job-b", name: "Job B", templateId: second.id },
    ]
  );
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
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

const JOB_NAMES: Record<string, string> = {
  main: "Sample CV",
  "job-a": "Job A",
  "job-b": "Job B",
};

/** Opens the CV page of a saved job by its address, once that job is the one being edited */
async function openJob(id: string): Promise<void> {
  await page.goto(`${app.webUrl}/jobs/${id}`);
  await page.locator("[data-cv-paper]").waitFor();
  // the page title names the active job: wait until it is the one in the address
  await page.waitForFunction(
    (name) => document.title.includes(` · ${name} · `),
    JOB_NAMES[id]
  );
}

describe("templates and jobs in the browser", () => {
  it("two jobs share a template: hiding is per job, a style change reaches both", async () => {
    await openJob("main");
    const firstSize = await sectionTitleSize();

    // Job B and Job A are on "Template Two"
    await openJob("job-b");
    await page
      .getByRole("combobox", { name: "Template of this job" })
      .filter({ hasText: "Template Two" })
      .waitFor();

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
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();

    // Job A still shows it
    await openJob("job-a");
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .first()
      .waitFor();

    // Change a style in the template (Design): both jobs follow
    await page.goto(`${app.webUrl}/templates/template-two/design`);
    await page
      .getByRole("combobox", { name: "Editing template" })
      .filter({ hasText: "Template Two" })
      .waitFor();
    // the page says how many jobs a change reaches
    await page.getByText(/this template is used by 2 jobs/).waitFor();
    await page.getByLabel("Increase headingMd size").click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await openJob("job-a");
    const sizeA = await sectionTitleSize();
    await openJob("job-b");
    const sizeB = await sectionTitleSize();
    expect(sizeA).toBeGreaterThan(firstSize);
    expect(sizeB).toBe(sizeA);

    // The first job is on its own template and did not change
    await openJob("main");
    expect(await sectionTitleSize()).toBe(firstSize);
  });

  it("keeps jobs, templates and sharing after saving and reloading", async () => {
    await openJob("job-b");
    await page
      .getByRole("combobox", { name: "Template of this job" })
      .filter({ hasText: "Template Two" })
      .waitFor();
    expect(
      await page
        .locator("[data-cv-item]")
        .filter({ hasText: "Sample Systems" })
        .count()
    ).toBe(0);
    await openJob("job-a");
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .first()
      .waitFor();

    // a template jobs use can be deleted: the dialog says which jobs move and asks where to
    await page.goto(`${app.webUrl}/templates`);
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
    await openJob("main");
    const sizeBefore = await sectionTitleSize();

    // A template no job uses
    await page
      .getByRole("navigation", { name: "Tools" })
      .getByRole("link", { name: "Templates" })
      .click();
    await page.getByLabel("New template name").fill("Unused look");
    await page.getByRole("button", { name: "Create template" }).click();
    const card = page
      .getByRole("list", { name: "Templates" })
      .getByRole("listitem")
      .filter({ hasText: "Unused look" });
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
    await openCvPage(page);
    await page.locator("[data-cv-paper]").waitFor();
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
