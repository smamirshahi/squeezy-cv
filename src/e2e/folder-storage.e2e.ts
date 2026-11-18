import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { createServer, ViteDevServer } from "vite";
import sample from "@fixtures/sample-cv.json";
import { withExportMeta } from "@shared/migration/export-meta";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createVariant } from "@shared/variant/variant-utils";

const file = migrateCvFile(sample);
const { template, job } = splitVariant(
  createVariant(file.vault, file.style, "short", "Short"),
  "tpl-short",
  "2026-11-07"
);

/** The records of a small CV, by file path (the same names as the server's data folder) */
const RECORDS: Record<string, unknown> = {
  "vault.json": withExportMeta(file, "vault", file.vault.version),
  [`templates/${template.id}.json`]: withExportMeta(
    template,
    "template",
    template.version
  ),
  [`jobs/${job.id}.json`]: withExportMeta(job, "job", job.version),
};

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

/**
 * A fresh browser profile. The folder picker is replaced by one that answers with a folder in
 * the browser's private file system (a real directory handle, no dialog to click), and the
 * tutorials are marked as seen so none opens over the page.
 */
async function newContext(): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addInitScript((tutorials) => {
    for (const key of tutorials) {
      localStorage.setItem(key, "1");
    }
    (
      window as unknown as { showDirectoryPicker: () => Promise<unknown> }
    ).showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle("picked", {
        create: true,
      });
  }, SEEN_TUTORIALS);
  return context;
}

/** Puts the records in the browser database (as if the person had used the app) */
async function seedBrowserData(page: Page): Promise<void> {
  await page.goto(`${webUrl}/robots.txt`);
  await page.evaluate(async (records) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("squeezy-cv", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("files");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const transaction = open.result.transaction("files", "readwrite");
        const store = transaction.objectStore("files");
        for (const [key, value] of Object.entries(records)) {
          store.put(value, key);
        }
        transaction.oncomplete = () => {
          open.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, RECORDS);
}

/** Removes the browser database, so only the folder can still hold the data */
async function dropBrowserDatabase(page: Page): Promise<void> {
  await page.goto(`${webUrl}/robots.txt`);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("squeezy-cv");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("blocked"));
      })
  );
}

/** Writes files into the folder the fake picker hands out, the way another program would */
async function writeFolder(
  page: Page,
  files: Record<string, string>
): Promise<void> {
  await page.evaluate(async (entries) => {
    const root = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle("picked", { create: true });
    for (const [path, text] of Object.entries(entries)) {
      const parts = path.split("/");
      let directory = root;
      for (const part of parts.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(part, { create: true });
      }
      const handle = await directory.getFileHandle(parts[parts.length - 1], {
        create: true,
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
    }
  }, files);
}

/** Every file in the folder, path to text */
async function readFolder(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async () => {
    const result: Record<string, string> = {};
    async function walk(
      directory: FileSystemDirectoryHandle,
      prefix: string
    ): Promise<void> {
      for await (const [name, entry] of directory.entries()) {
        if (entry.kind === "directory") {
          await walk(entry, `${prefix}${name}/`);
        } else {
          result[`${prefix}${name}`] = await (await entry.getFile()).text();
        }
      }
    }
    await walk(
      await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle("picked", { create: true }),
      ""
    );
    return result;
  });
}

async function openDataDialog(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Your data: backup and restore" })
    .click();
}

/** Clicks and waits for the page reload the click causes */
async function clickAndReload(
  page: Page,
  name: string | RegExp
): Promise<void> {
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name }).click(),
  ]);
  await page.waitForSelector("#root *");
}

/** Opens the print view of the job: it shows the name only when the data was read from somewhere */
async function printedName(page: Page): Promise<string> {
  await page.goto(`${webUrl}/print/${job.id}`);
  await page.waitForSelector("[data-cv-ready]");
  return page.innerText("body");
}

describe("data in a chosen folder (real Chromium)", () => {
  it("copies the browser's data into an empty folder, then reads from the folder", async () => {
    const page = await (await newContext()).newPage();
    await seedBrowserData(page);
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    expect(await page.getByText("Store my data in a folder").isVisible()).toBe(
      true
    );
    await clickAndReload(page, "Choose folder");

    const files = await readFolder(page);
    expect(Object.keys(files).sort()).toEqual([
      `jobs/${job.id}.json`,
      `templates/${template.id}.json`,
      "vault.json",
    ]);
    const vault = JSON.parse(files["vault.json"]) as {
      meta: { kind: string };
      vault: { profile: { fullName: string } };
    };
    expect(vault.meta.kind).toBe("vault");
    expect(vault.vault.profile.fullName).toBe(file.vault.profile.fullName);

    await openDataDialog(page);
    expect(
      await page.getByText(/Your data is in the folder “picked”/).isVisible()
    ).toBe(true);

    // The proof: without the browser database the app still has the CV
    await dropBrowserDatabase(page);
    expect(await printedName(page)).toContain(file.vault.profile.fullName);
  });

  it("asks before using a folder that has data and uses the folder's data on request", async () => {
    const page = await (await newContext()).newPage();
    await page.goto(`${webUrl}/robots.txt`);
    await writeFolder(
      page,
      Object.fromEntries(
        Object.entries(RECORDS).map(([path, value]) => [
          path,
          JSON.stringify(value),
        ])
      )
    );
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await page.getByRole("button", { name: "Choose folder" }).click();
    await page.getByText(/already has Squeezy CV data/).waitFor();
    // Nothing was written or switched yet
    expect(
      await page.getByRole("button", { name: "Choose folder" }).count()
    ).toBe(0);
    await clickAndReload(page, /Use the folder’s data/);
    expect(await printedName(page)).toContain(file.vault.profile.fullName);
  });

  it("replaces the folder's version with the browser's on request", async () => {
    const page = await (await newContext()).newPage();
    await seedBrowserData(page);
    await writeFolder(page, { "vault.json": '{"old":true}' });
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await page.getByRole("button", { name: "Choose folder" }).click();
    await clickAndReload(page, /Replace it with this browser/);
    const vault = JSON.parse((await readFolder(page))["vault.json"]) as object;
    expect(vault).not.toHaveProperty("old");
    expect(vault).toHaveProperty("vault");
  });

  it("goes back to the browser on Disconnect and leaves the folder's files", async () => {
    const page = await (await newContext()).newPage();
    await seedBrowserData(page);
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await clickAndReload(page, "Choose folder");
    await openDataDialog(page);
    await clickAndReload(page, "Disconnect");
    await openDataDialog(page);
    expect(
      await page.getByRole("button", { name: "Choose folder" }).isVisible()
    ).toBe(true);
    expect(await page.getByText(/Your data is in the folder/).count()).toBe(0);
    expect(Object.keys(await readFolder(page))).toContain("vault.json");
    // The browser's own copy is still there and used again
    expect(await printedName(page)).toContain(file.vault.profile.fullName);
  });

  it("tells when the files changed outside the app and offers a reload", async () => {
    const page = await (await newContext()).newPage();
    await seedBrowserData(page);
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await clickAndReload(page, "Choose folder");
    await page.waitForSelector("[data-cv-ready], #root *");
    // Nothing changed yet: coming back to the tab says nothing
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    expect(await page.getByText(/changed outside the app/).count()).toBe(0);
    // Another program (a sync client, say) writes the CV
    await writeFolder(page, {
      "vault.json": JSON.stringify(RECORDS["vault.json"]),
    });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText(/changed outside the app/).waitFor();
    expect(await page.getByRole("button", { name: "Reload" }).isVisible()).toBe(
      true
    );
  });

  it("asks to reconnect when the browser forgot the permission, and then opens the app", async () => {
    const context = await newContext();
    const page = await context.newPage();
    await seedBrowserData(page);
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await clickAndReload(page, "Choose folder");

    // From now on the browser asks again, like it does on the next visit
    await context.addInitScript(() => {
      let isAllowed = sessionStorage.getItem("test-allowed") === "1";
      const prototype = FileSystemHandle.prototype as unknown as {
        queryPermission: () => Promise<string>;
        requestPermission: () => Promise<string>;
      };
      prototype.queryPermission = () =>
        Promise.resolve(isAllowed ? "granted" : "prompt");
      prototype.requestPermission = () => {
        isAllowed = true;
        sessionStorage.setItem("test-allowed", "1");
        return Promise.resolve("granted");
      };
    });
    await page.goto(`${webUrl}/jobs`);
    await page
      .getByRole("heading", { name: "Reconnect your data folder" })
      .waitFor();
    expect(await page.getByText(/the folder “picked”/).isVisible()).toBe(true);
    await clickAndReload(page, "Reconnect folder");
    await openDataDialog(page);
    expect(
      await page.getByText(/Your data is in the folder “picked”/).isVisible()
    ).toBe(true);
  });

  it("lets go of the folder when everything is deleted, and leaves its files", async () => {
    const page = await (await newContext()).newPage();
    await seedBrowserData(page);
    await page.goto(`${webUrl}/jobs`);
    await openDataDialog(page);
    await clickAndReload(page, "Choose folder");
    await openDataDialog(page);
    await page.getByRole("button", { name: "Delete all my data…" }).click();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Delete everything" }).click(),
    ]);
    await page.waitForSelector("#root *");
    expect(Object.keys(await readFolder(page))).toContain("vault.json");
    await page.goto(`${webUrl}/jobs`);
    await page.waitForSelector("#root *");
    // Not asking to reconnect: the folder is forgotten
    expect(await page.getByText("Reconnect your data folder").count()).toBe(0);
  });
});
