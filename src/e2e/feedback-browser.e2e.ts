import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { createServer, ViteDevServer } from "vite";

const SEEN_TUTORIALS = [
  "squeezy-cv-vault-tutorial-seen",
  "squeezy-cv-template-tutorial-seen",
  "squeezy-cv-apply-tutorial-seen",
  "squeezy-cv-applications-tutorial-seen",
  "squeezy-cv-ai-tutorial-seen",
];

let web: ViteDevServer;
let browser: Browser;
let webUrl: string;

beforeAll(async () => {
  // The browser version: no server at all
  process.env.VITE_STORAGE_MODE = "browser";
  web = await createServer({
    configFile: "vite.config.ts",
    logLevel: "error",
    server: { port: 0 },
  });
  await web.listen();
  webUrl = (web.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await web?.close();
  delete process.env.VITE_STORAGE_MODE;
});

/** A fresh profile; GitHub is answered locally so nothing leaves the machine */
async function newContext(): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addInitScript((tutorials) => {
    for (const key of tutorials) {
      localStorage.setItem(key, "1");
    }
  }, SEEN_TUTORIALS);
  await context.route("https://github.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>GitHub</p>" })
  );
  return context;
}

async function openDialog(page: Page): Promise<void> {
  await page.goto(`${webUrl}/jobs`);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByRole("dialog", { name: "Send feedback" }).waitFor();
}

describe("send feedback without a server (real Chromium)", () => {
  it("opens GitHub with the note filled in and never calls the app's own API", async () => {
    const context = await newContext();
    const page = await context.newPage();
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/feedback")) {
        apiCalls.push(request.url());
      }
    });
    await openDialog(page);

    const open = page.getByRole("button", { name: "Open on GitHub" });
    expect(
      await page.getByRole("button", { name: "Send", exact: true }).count()
    ).toBe(0);
    expect(await open.isDisabled()).toBe(true);

    await page.getByRole("button", { name: "Bug" }).click();
    await page
      .getByLabel("Your note")
      .fill("I clicked Save for later and nothing happened");
    expect(await open.isEnabled()).toBe(true);

    const [opened] = await Promise.all([
      context.waitForEvent("page"),
      open.click(),
    ]);
    await opened.waitForLoadState();
    const url = new URL(opened.url());
    expect(url.origin + url.pathname).toBe(
      "https://github.com/smamirshahi/squeezy-cv/issues/new"
    );
    expect(url.searchParams.get("title")).toBe(
      "[Bug] I clicked Save for later and nothing happened"
    );
    expect(url.searchParams.get("body")).toContain("nothing happened");
    // A bug report carries the app info, which says the app version, browser and page
    expect(url.searchParams.get("body")).toContain("App info");
    expect(url.searchParams.get("labels")).toBe("customer-created,bug");

    await page.getByText("GitHub opened in a new tab").waitFor();
    expect(apiCalls).toEqual([]);

    // Another note starts from an empty form
    await page.getByRole("button", { name: "Write another" }).click();
    expect(await page.getByLabel("Your note").inputValue()).toBe("");
  });

  it("gives the opened page no link back to the app", async () => {
    const context = await newContext();
    const page = await context.newPage();
    await openDialog(page);
    await page.getByLabel("Your note").fill("Nice app");
    const [opened] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: "Open on GitHub" }).click(),
    ]);
    await opened.waitForLoadState();
    expect(await opened.evaluate(() => window.opener)).toBeNull();
  });

  it("copies the text for someone without a GitHub account", async () => {
    const context = await newContext();
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: webUrl,
    });
    const page = await context.newPage();
    await openDialog(page);
    await page.getByLabel("Your note").fill("Please add a dark mode");
    await page.getByRole("button", { name: "Copy the text" }).click();
    await page.getByRole("button", { name: "Copied" }).waitFor();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Please add a dark mode"
    );
    expect(context.pages()).toHaveLength(1);
  });

  it("does not open a link for a note too long for one, and keeps the text", async () => {
    const context = await newContext();
    const page = await context.newPage();
    await openDialog(page);
    await page.getByLabel("Your note").fill("é & ".repeat(1000));
    await page.getByRole("button", { name: "Open on GitHub" }).click();
    await page.getByText(/too long to put in a link/).waitFor();
    expect(context.pages()).toHaveLength(1);
    expect(
      (await page.getByLabel("Your note").inputValue()).length
    ).toBeGreaterThan(0);
  });
});
