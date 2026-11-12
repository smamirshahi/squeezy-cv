import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
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
    await page.goto(`${app.webUrl}/jobs/main?view=page`);
    await page.getByText("Jane Doe").first().waitFor();
    await page.getByText("Saved", { exact: true }).waitFor();

    // Mark as applied is part of the export: tick it, download, then fill in the form
    await page.getByRole("button", { name: "Export PDF" }).first().click();
    await page.getByLabel("Then mark this as applied").check();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    await download;
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

  it("one click in the list opens the sent PDF, unchanged by later edits", async () => {
    await page.goto(`${app.webUrl}/applications`);
    const view = page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .getByRole("link", { name: "View" });
    await view.waitFor();
    const href = await view.getAttribute("href");
    expect(href).toMatch(/^\/api\/applications\/.+\/pdf$/);
    const response = await page.request.get(`${app.webUrl}${href}`);
    expect(response.status()).toBe(200);
    const sent = await readPdf(Buffer.from(await response.body()));
    expect(sent.text).toContain("Sample Systems");
  });

  it("the list and the application page show job and template; Create new job from this", async () => {
    await page.goto(`${app.webUrl}/applications`);
    await page.getByRole("columnheader", { name: "Role · Template" }).waitFor();
    const application = await onlyApplication();
    await page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .getByText(application.templateName)
      .first()
      .waitFor();

    await page.goto(`${app.webUrl}/applications/${application.id}`);
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

describe("the Applications page, as a user sees it", () => {
  it("groups the filters, shows a pill status and opens the job in a new tab", async () => {
    await page.goto(`${app.webUrl}/applications`);
    const nav = page.getByRole("navigation", { name: "Filter by status" });
    await nav.getByText("Before sending").waitFor();
    await nav.getByText("Sent", { exact: true }).waitFor();
    const row = page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .filter({ hasText: "CV sent" });
    await row.getByRole("combobox", { name: "Status of Acme Ltd" }).waitFor();

    // the open icon is a link to the job that opens in a new tab
    const open = row.getByRole("link", { name: /^Open job/ });
    await open.waitFor();
    expect(await open.getAttribute("target")).toBe("_blank");
    expect(await open.getAttribute("href")).toBe("/jobs/main?view=details");
  });

  it("a row opens the side panel with the job data, and the panel closes", async () => {
    await page.goto(`${app.webUrl}/applications`);
    // the middle of a row can be the status dropdown, so click the role cell
    await page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .filter({ hasText: "CV sent" })
      .getByRole("cell")
      .nth(1)
      .click();
    const panel = page.getByRole("complementary", {
      name: "Application detail",
    });
    await panel.getByText("Job data").waitFor();
    await panel.getByText("Template", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Close" }).click();
    await panel.waitFor({ state: "detached" });
  });

  it("changing the status in the list is saved on the server", async () => {
    await page.goto(`${app.webUrl}/applications`);
    const row = page
      .getByRole("row")
      .filter({ hasText: "Acme Ltd" })
      .filter({ hasText: "CV sent" });
    await row.getByRole("combobox", { name: "Status of Acme Ltd" }).click();
    await page.getByRole("option", { name: "Interview" }).click();
    const application = await onlyApplication();
    await expect
      .poll(
        async () =>
          (
            (await (
              await page.request.get(
                `${app.webUrl}/api/applications/${application.id}`
              )
            ).json()) as { status: string }
          ).status
      )
      .toBe("interview");
  });
});
