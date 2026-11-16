import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, Page, chromium } from "playwright";
import { createServer, ViteDevServer } from "vite";
import sample from "@fixtures/sample-cv.json";
import { withExportMeta } from "@shared/migration/export-meta";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const VAULT = withExportMeta(file, "vault", file.vault.version);

let web: ViteDevServer;
let browser: Browser;
let webUrl: string;

beforeAll(async () => {
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

/** A fresh browser profile with a saved CV, a setting, an AI key and a cache, then the app opened */
async function appWithData(): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${webUrl}/robots.txt`);
  await page.evaluate(async (vault) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("cv-builder", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("files");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const transaction = open.result.transaction("files", "readwrite");
        transaction.objectStore("files").put(vault, "vault.json");
        transaction.oncomplete = () => {
          open.result.close();
          resolve();
        };
      };
    });
    localStorage.setItem("cv-builder-ai-keys", '{"claude":"secret"}');
    localStorage.setItem("cv-builder-ai-choice", "{}");
    // Tutorials seen, so none opens over the page (deleting the data brings them back)
    for (const key of [
      "cv-builder-vault-tutorial-seen",
      "cv-builder-template-tutorial-seen",
      "cv-builder-apply-tutorial-seen",
      "cv-builder-applications-tutorial-seen",
    ]) {
      localStorage.setItem(key, "1");
    }
    await caches.open("test-cache");
  }, VAULT);
  await page.goto(`${webUrl}/jobs`);
  return page;
}

async function openDeleteDialog(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Your data: backup and restore" })
    .click();
  await page.getByRole("button", { name: "Delete all my data…" }).click();
}

/** What is left: records in the database, localStorage keys, caches */
async function leftovers(
  page: Page
): Promise<{ records: number; keys: number; caches: number }> {
  return page.evaluate(async () => {
    const records = await new Promise<number>((resolve) => {
      const open = indexedDB.open("cv-builder", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("files");
      open.onsuccess = () => {
        const request = open.result
          .transaction("files")
          .objectStore("files")
          .count();
        request.onsuccess = () => {
          open.result.close();
          resolve(request.result);
        };
      };
    });
    return {
      records,
      keys: localStorage.length,
      caches: (await caches.keys()).length,
    };
  });
}

describe("Delete all my data (real Chromium)", () => {
  it("cancelling leaves everything untouched", async () => {
    const page = await appWithData();
    await openDeleteDialog(page);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Cancel" }).click();
    const left = await leftovers(page);
    expect(left.records).toBeGreaterThan(0);
    expect(left.keys).toBeGreaterThan(0);
    expect(left.caches).toBe(1);
  });

  it("removes the database records, the local storage and the caches, then starts empty", async () => {
    const page = await appWithData();
    await openDeleteDialog(page);
    const button = page.getByRole("button", { name: "Delete everything" });
    expect(await button.isDisabled()).toBe(true);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await Promise.all([page.waitForNavigation(), button.click()]);
    await page.waitForSelector("#root *");
    const left = await leftovers(page);
    // The empty app writes its own defaults (theme) on start, and the first tutorial opens again
    // (opening it marks it seen); nothing else of before is left
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys).not.toContain("cv-builder-ai-keys");
    expect(keys).not.toContain("cv-builder-ai-choice");
    expect(keys).not.toContain("cv-builder-template-tutorial-seen");
    expect(keys).not.toContain("cv-builder-apply-tutorial-seen");
    expect(keys).not.toContain("cv-builder-applications-tutorial-seen");
    await page.getByRole("dialog").waitFor();
    expect(left.records).toBe(0);
    expect(left.caches).toBe(0);
  });
});
