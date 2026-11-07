import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
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

interface ApplicationJson {
  id: string;
  jobId: string;
  templateId: string;
  jobName: string;
  templateName: string;
}

async function onlyApplication(): Promise<ApplicationJson> {
  const list = (await (
    await page.request.get(`${app.webUrl}/api/applications`)
  ).json()) as { id: string }[];
  expect(list).toHaveLength(1);
  return (
    await page.request.get(`${app.webUrl}/api/applications/${list[0].id}`)
  ).json();
}

describe("an application is a frozen copy, nothing is locked", () => {
  let before = "";
  let pdfBefore: Buffer;

  it("Mark as applied names the job and template; the sent CV is stored", async () => {
    await page.goto(app.webUrl);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Mark as applied" }).click();
    await page.getByText(/Job: .* · Template: /).waitFor();
    await page.getByRole("textbox", { name: /^Company/ }).fill("Acme Ltd");
    await page.getByRole("textbox", { name: /^Role/ }).fill("Senior Dev");
    await page.getByRole("button", { name: "Save application" }).click();
    await page.getByText("Saved: Acme Ltd, Senior Dev").waitFor();

    const application = await onlyApplication();
    expect(application.jobId).toBe("main");
    expect(application.jobName).toBeTruthy();
    expect(application.templateName).toBeTruthy();
    before = JSON.stringify(application);
    pdfBefore = Buffer.from(
      await (
        await page.request.get(
          `${app.webUrl}/api/applications/${application.id}/pdf`
        )
      ).body()
    );
    expect((await readPdf(pdfBefore)).text).toContain("Sample Systems");
  });

  it("the job and template stay fully editable: hide an item, save, rename the template", async () => {
    await expect(page.getByText(/locked|unlock/i).count()).resolves.toBe(0);
    await page
      .locator("[data-cv-item]")
      .filter({ hasText: "Sample Systems" })
      .click();
    const shown = page.getByRole("button", { name: "Shown", exact: true });
    expect(await shown.isDisabled()).toBe(false);
    await shown.click();
    await page.getByText("Unsaved changes").waitFor();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved", { exact: true }).waitFor();

    // the saved job now hides it
    const job = await (
      await page.request.get(`${app.webUrl}/api/jobs/main`)
    ).json();
    expect(JSON.stringify(job.selection)).toContain("false");

    // and the template can be renamed through the API (no 409 "locked")
    const template = await (
      await page.request.get(`${app.webUrl}/api/templates/${job.templateId}`)
    ).json();
    const renamed = await page.request.put(
      `${app.webUrl}/api/templates/${job.templateId}`,
      { data: { ...template, name: "Renamed look" } }
    );
    expect(renamed.status()).toBe(200);
  });

  it("the stored application and its PDF are unchanged", async () => {
    const application = await onlyApplication();
    expect(JSON.stringify(application)).toBe(before);
    const pdfAfter = Buffer.from(
      await (
        await page.request.get(
          `${app.webUrl}/api/applications/${application.id}/pdf`
        )
      ).body()
    );
    expect(pdfAfter.equals(pdfBefore)).toBe(true);
    // the new export (job as it is now) no longer has the item, the sent one does
    const now = await readPdf(await app.pdfOfJob("main"));
    expect(now.text).not.toContain("Sample Systems");
    expect((await readPdf(pdfAfter)).text).toContain("Sample Systems");
  });

  it("the list and the application page show job and template; Create new job from this", async () => {
    await page.goto(`${app.webUrl}/?applications`);
    await page.getByRole("columnheader", { name: "Template" }).waitFor();
    const application = await onlyApplication();
    await page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .getByText(application.templateName)
      .first()
      .waitFor();

    await page.goto(`${app.webUrl}/?application=${application.id}`);
    await page.getByText(/frozen copy; later edits/).waitFor();
    await page.getByTestId("application-sources").waitFor();
    await page
      .getByRole("button", { name: "Create new job from this" })
      .click();
    await page.getByText(/A copy was added to your jobs/).waitFor();

    const jobs = (await (
      await page.request.get(`${app.webUrl}/api/jobs`)
    ).json()) as { id: string }[];
    expect(jobs).toHaveLength(2);
    const copy = jobs.find((j) => j.id !== "main");
    const copyJob = await (
      await page.request.get(`${app.webUrl}/api/jobs/${copy?.id}`)
    ).json();
    // same template as the sent one, and the sent CV still showing the item
    expect(copyJob.templateId).toBe(application.templateId);
    expect(copyJob.selection).not.toEqual(
      (await (await page.request.get(`${app.webUrl}/api/jobs/main`)).json())
        .selection
    );
  });
});
