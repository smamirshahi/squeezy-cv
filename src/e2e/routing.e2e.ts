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

function rail(name: string): ReturnType<Page["getByRole"]> {
  return page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name });
}

describe("routing in a real browser", () => {
  it("opens a job by its address and keeps it after a reload", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await page.getByText("Jane Doe").first().waitFor();
    expect(new URL(page.url()).pathname).toBe("/jobs/main");
    await page.reload();
    await page.getByText("Jane Doe").first().waitFor();
    expect(new URL(page.url()).pathname).toBe("/jobs/main");
    expect(await page.title()).toBe("Jobs · Sample CV · CV Builder");
  });

  it("goes Back and Forward between sections without leaving the app", async () => {
    await page.goto(`${app.webUrl}/jobs/main`);
    await page.getByText("Jane Doe").first().waitFor();
    await rail("Templates").click();
    await page.waitForURL("**/templates");
    await rail("Vault").click();
    await page.waitForURL("**/vault");

    await page.goBack();
    await page.waitForURL("**/templates");
    await page.getByRole("main", { name: "Templates" }).waitFor();
    await page.goBack();
    await page.waitForURL("**/jobs/main");
    await page.goForward();
    await page.waitForURL("**/templates");
  });

  it("keeps the vault item after a reload", async () => {
    await page.goto(`${app.webUrl}/vault`);
    const tree = page.getByRole("complementary", { name: "Vault tree" });
    await tree.getByRole("link", { name: /^Work Experience/ }).click();
    await page
      .getByRole("main", { name: "Edit" })
      .getByRole("link", { name: /^Senior Software Developer/ })
      .click();
    await page.getByLabel("Edit item").waitFor();
    const address = new URL(page.url()).pathname;
    expect(address).toMatch(/^\/vault\/[^/]+\/[^/]+$/);
    await page.reload();
    await page.getByLabel("Edit item").waitFor();
    expect(new URL(page.url()).pathname).toBe(address);
  });

  it("opens the template tab by address", async () => {
    await page.goto(`${app.webUrl}/templates/style`);
    await page.getByRole("main", { name: "Templates" }).waitFor();
    await page.getByText("Reset to defaults").waitFor();
  });

  it("says not found for an unknown job, with a way back", async () => {
    await page.goto(`${app.webUrl}/jobs/does-not-exist`);
    await page.getByText(/This job does not exist/).waitFor();
    await page.getByRole("link", { name: "Back to your jobs" }).click();
    await page.waitForURL("**/jobs/main");
    await page.getByText("Jane Doe").first().waitFor();
  });

  it("redirects the old query addresses", async () => {
    await page.goto(`${app.webUrl}/?applications&status=offer`);
    await page.waitForURL("**/applications?status=offer");
    await page.goto(`${app.webUrl}/?print=main`);
    await page.waitForURL("**/print/main");
    await page.locator('[data-cv-ready="true"]').waitFor({ state: "attached" });
  });

  it("asks before Back throws away an unapplied edit", async () => {
    await page.goto(`${app.webUrl}/vault/mainInfo`);
    await expect
      .poll(async () => page.getByLabel("Full Name").inputValue())
      .toBe("Jane Doe");
    await page.getByLabel("Full Name").fill("Changed Name");
    let message = "";
    page.once("dialog", (dialog) => {
      message = dialog.message();
      void dialog.dismiss();
    });
    await rail("Templates").click();
    await expect.poll(() => message).toContain("not applied");
    expect(new URL(page.url()).pathname).toBe("/vault/mainInfo");
    expect(await page.getByLabel("Full Name").inputValue()).toBe(
      "Changed Name"
    );
  });
});
