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

describe("a premade template added before any job exists", () => {
  it("is saved, and is still listed after a reload", async () => {
    await page.goto(`${app.webUrl}/templates`);
    await page
      .getByRole("button", { name: "Add Developer template to my templates" })
      .click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();

    const saved = (await (
      await fetch(`${app.apiUrl}/api/templates`)
    ).json()) as { name: string }[];
    expect(saved.map((t) => t.name)).toEqual(["Developer"]);

    await page.reload();
    const list = page.getByRole("list", { name: "Templates" });
    await list.getByText("Developer", { exact: true }).first().waitFor();
    expect(await list.getByRole("listitem").count()).toBeGreaterThan(0);
    // reloading does not create or save a job
    const jobs = (await (await fetch(`${app.apiUrl}/api/jobs`)).json()) as {
      id: string;
    }[];
    expect(jobs).toEqual([]);
  });
});
