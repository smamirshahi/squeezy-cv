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

async function openDialog(): Promise<void> {
  await page.goto(`${app.webUrl}/jobs`);
  await page.getByText("Jane Doe").first().waitFor();
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByRole("dialog", { name: "Send feedback" }).waitFor();
}

describe("send feedback", () => {
  it("sits right of the Tutorials button and opens with the keyboard", async () => {
    await page.goto(`${app.webUrl}/jobs`);
    await page.getByText("Jane Doe").first().waitFor();
    const tutorials = page.getByRole("button", { name: "Tutorials" });
    const feedback = page.getByRole("button", { name: "Send feedback" });
    const [a, b] = [
      await tutorials.boundingBox(),
      await feedback.boundingBox(),
    ];
    expect(b!.x).toBeGreaterThan(a!.x);
    expect(Math.abs(b!.y - a!.y)).toBeLessThan(4);

    await feedback.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog", { name: "Send feedback" }).waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("dialog", { name: "Send feedback" })
      .waitFor({ state: "hidden" });
  });

  it("sends a bug with the app info and shows the issue", async () => {
    let seen: Record<string, unknown> | undefined;
    await page.route("**/api/feedback", async (route) => {
      seen = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          number: 431,
          url: "https://github.com/x/y/431",
        }),
      });
    });
    await openDialog();
    await page.getByRole("button", { name: "Bug" }).click();
    const send = page.getByRole("button", { name: "Send", exact: true });

    await page.getByLabel("Your note").fill("broken");
    expect(await send.isDisabled()).toBe(true);
    await page.getByText(/at least 10 characters/).waitFor();

    await page
      .getByLabel("Your note")
      .fill("I clicked Save for later and nothing happened");
    expect(await send.isEnabled()).toBe(true);
    await send.click();
    await page.getByText("Thanks, your note is #431").waitFor();

    expect(seen).toMatchObject({
      kind: "bug",
      note: "I clicked Save for later and nothing happened",
    });
    expect(seen?.appInfo).toMatch(/^Squeezy CV \d+\.\d+\.\d+ · Chrome \d+ on /);
    expect(seen?.appInfo).toMatch(/ · jobs page$/);
    expect(seen?.mood).toBeUndefined();
    expect(
      await page
        .getByRole("link", { name: /View it on GitHub/ })
        .getAttribute("href")
    ).toBe("https://github.com/x/y/431");
    await page.unroute("**/api/feedback");
  });

  it("sends feedback with a face and no app info", async () => {
    let seen: Record<string, unknown> | undefined;
    await page.route("**/api/feedback", async (route) => {
      seen = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ number: 2, url: "https://github.com/x/y/2" }),
      });
    });
    await openDialog();
    await page.getByRole("button", { name: "Happy" }).click();
    await page.getByLabel("Your note").fill("Easy to use");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByText("Thanks, your note is #2").waitFor();
    expect(seen).toEqual({
      kind: "feedback",
      mood: "happy",
      note: "Easy to use",
    });
    await page.unroute("**/api/feedback");
  });

  it("keeps the text and offers the GitHub page when sending is not set up", async () => {
    await openDialog();
    await page.getByRole("button", { name: "Feature" }).click();
    await page
      .getByLabel("Your note")
      .fill("Copy a job as a starting point for the next one");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    const alert = page.getByRole("alert");
    await alert.waitFor();
    expect(await alert.textContent()).toContain("Could not send.");
    expect(await page.getByLabel("Your note").inputValue()).toBe(
      "Copy a job as a starting point for the next one"
    );
    const href = await page
      .getByRole("link", { name: /Open on GitHub/ })
      .getAttribute("href");
    const url = new URL(href ?? "");
    expect(url.pathname).toMatch(/\/issues\/new$/);
    expect(url.searchParams.get("labels")).toBe("customer-created,feature");
  });
});
