import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { RunningApp, startApp } from "@e2e/start-app";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

let app: RunningApp;
let browser: Browser;
let page: Page;

beforeAll(async () => {
  app = await startApp();
  // a vault and nothing else: no template and no job
  await app.seedJobs(sampleFile(), [], []);
  browser = await chromium.launch();
  page = await browser.newPage();
  await skipTutorials(page);
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

function tool(name: string): ReturnType<Page["getByRole"]> {
  return page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name });
}

describe("a vault with no template and no job", () => {
  it("shows no job, a template page without cards, and a disabled Design", async () => {
    await page.goto(app.webUrl);
    // the first address opens the Apply tool, which sends you to the job application first
    await page.getByRole("main", { name: "No job added yet" }).waitFor();
    await page.getByText("Start with the job application").waitFor();
    expect(await page.locator("[data-cv-paper]").count()).toBe(0);

    await tool("Templates").click();
    await page.getByLabel("New template name").waitFor();
    const list = page.getByRole("list", { name: "Templates" });
    expect(await list.getByRole("listitem").count()).toBe(0);
    const design = page.getByRole("link", { name: /Design/ });
    expect(await design.getAttribute("aria-disabled")).toBe("true");
  });

  it("creating a template saves only the template and enables Design", async () => {
    await page.getByLabel("New template name").fill("First look");
    await page.getByRole("button", { name: "Create template" }).click();
    await page
      .getByRole("list", { name: "Templates" })
      .getByRole("listitem")
      .filter({ hasText: "First look" })
      .waitFor();
    expect(
      await page
        .getByRole("link", { name: /Design/ })
        .getAttribute("aria-disabled")
    ).not.toBe("true");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    const templates = (await (
      await fetch(`${app.apiUrl}/api/templates`)
    ).json()) as { name: string }[];
    const jobs = (await (await fetch(`${app.apiUrl}/api/jobs`)).json()) as {
      id: string;
    }[];
    expect(templates.map((t) => t.name)).toEqual(["First look"]);
    expect(jobs).toEqual([]);
  });

  it("adding the first job makes it real and saves it", async () => {
    await tool("Apply").click();
    // the stand-in job is never edited: the first edit creates the real one
    await page.getByRole("textbox", { name: "Job name" }).fill("My first job");
    await page.getByRole("button", { name: "Save and continue" }).click();
    // "Save and continue" saves the job and opens the CV page
    await page.locator("[data-cv-paper]").waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();
    const jobs = (await (await fetch(`${app.apiUrl}/api/jobs`)).json()) as {
      name: string;
    }[];
    expect(jobs.map((j) => j.name)).toEqual(["My first job"]);
  });
});
