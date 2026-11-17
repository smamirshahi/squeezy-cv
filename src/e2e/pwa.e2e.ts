import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium } from "playwright";
import { PreviewServer, build, preview } from "vite";

let browser: Browser;
let server: PreviewServer;
let outDir: string;
let webUrl: string;

beforeAll(async () => {
  process.env.VITE_STORAGE_MODE = "browser";
  outDir = await mkdtemp(path.join(os.tmpdir(), "cv-pwa-"));
  // The real production build of the browser version, served the way a host would
  await build({
    configFile: "vite.config.ts",
    logLevel: "error",

    build: { outDir, emptyOutDir: true },
  });
  server = await preview({
    configFile: "vite.config.ts",
    logLevel: "error",

    build: { outDir },
    preview: { port: 0, host: "127.0.0.1" },
  });
  webUrl = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
  delete process.env.VITE_STORAGE_MODE;
  await rm(outDir, { recursive: true, force: true });
});

describe("installable app that works offline (real Chromium)", () => {
  it("has a manifest an installable app needs", async () => {
    const response = await fetch(`${webUrl}/manifest.webmanifest`);
    expect(response.ok).toBe(true);
    const manifest = (await response.json()) as {
      name: string;
      display: string;
      start_url: string;
      icons: { sizes: string; purpose?: string }[];
    };
    expect(manifest.name).toBe("Squeezy CV");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/vault");
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"])
    );
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(
      true
    );
  });

  it("opens offline after the first visit, also on a deep link", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${webUrl}/jobs`);
    // Wait until the service worker has the app cached
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // The first load is not controlled by the worker: a reload hands the page to it
    await page.reload();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null
    );

    await context.setOffline(true);
    await page.goto(`${webUrl}/vault`);
    // The app (not the browser's offline error page) is shown
    await page.waitForSelector("#root *", { timeout: 15_000 });
    expect(await page.title()).toBe("Vault · Squeezy CV");
    expect((await page.content()).includes("ERR_INTERNET_DISCONNECTED")).toBe(
      false
    );
    await context.close();
  });
});
