import type { Browser } from "playwright";

/** Makes a PDF of a saved job. Behind an interface so the routes can be tested without a browser. */
export interface PdfRenderer {
  render(jobId: string): Promise<Buffer>;
  close(): Promise<void>;
}

/** How long the print page may take to load and lay itself out */
const READY_TIMEOUT_MS = 30_000;

/** Page markers the print route sets when it is done (see `PrintView`) */
const READY_SELECTOR = '[data-cv-ready="true"]';
const ERROR_SELECTOR = "[data-cv-error]";

/**
 * Renders the app's print-only route in headless Chromium, so the PDF is made by the same
 * layout engine as the preview. Needs the web app to be served at `webUrl` and Chromium
 * to be installed (`pnpm exec playwright install chromium`).
 */
export class PlaywrightPdfRenderer implements PdfRenderer {
  private browser: Promise<Browser> | null = null;

  constructor(private readonly webUrl: string) {}

  private getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = import("playwright")
        .then(({ chromium }) => chromium.launch())
        .catch((error: unknown) => {
          // Try again next time (e.g. after installing the browser)
          this.browser = null;
          throw error;
        });
    }
    return this.browser;
  }

  async render(jobId: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      const url = new URL(`/print/${encodeURIComponent(jobId)}`, this.webUrl);
      await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await page
        .locator(`${READY_SELECTOR}, ${ERROR_SELECTOR}`)
        .first()
        .waitFor({ state: "attached", timeout: READY_TIMEOUT_MS });
      if ((await page.locator(ERROR_SELECTOR).count()) > 0) {
        const message = await page.locator(ERROR_SELECTOR).first().innerText();
        throw new Error(`The print page failed: ${message}`);
      }
      // The page sets its own @page size and margin

      return await page.pdf({ preferCSSPageSize: true, printBackground: true });
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    const pending = this.browser;
    this.browser = null;
    if (pending) {
      await (await pending).close();
    }
  }
}
