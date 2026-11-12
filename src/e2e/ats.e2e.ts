import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, chromium, Page } from "playwright";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { splitVariant } from "@shared/variant/template-job";
import { scoreAts } from "@shared/ats/ats-score";
import { render } from "@shared/variant/render";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
import { sampleFile, skipTutorials } from "@e2e/fixtures";

const analysis = {
  jobTitle: "Frontend Engineer",
  seniority: "senior",
  mustHave: ["React", "TypeScript", "GraphQL"],
  niceToHave: ["Jest"],
  keywords: ["Redux"],
};

let app: RunningApp;
let browser: Browser;
const file = sampleFile();

beforeAll(async () => {
  app = await startApp();
  const { template, job } = splitVariant(
    createDefaultVariant(file, "main"),
    "template-main"
  );
  await app.seedJobs(
    file,
    [template],
    [
      {
        ...job,
        jobAd: "Frontend Engineer. 5+ years. Strong communication.",
        analysis,
      },
    ]
  );
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await app?.close();
});

async function open(width: number, height: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await skipTutorials(page);
  const view = width >= 1200 ? "page" : "ats";
  await page.goto(`${app.webUrl}/jobs/main?view=${view}`);
  await page.getByRole("navigation", { name: "Tools" }).waitFor();
  await page.waitForLoadState("networkidle");
  return page;
}

describe("ATS score", () => {
  it("is a section of the Apply sidebar on a desktop and scores the CV", async () => {
    const page = await open(1440, 900);
    const section = page.getByRole("region", { name: "ATS score" });
    await section.waitFor();
    await section.getByRole("button", { name: "Analyse CV" }).click();
    const ring = section.getByRole("img", {
      name: /^ATS score \d+ out of 100/,
    });
    await ring.waitFor();
    expect(
      await section.getByTestId("ats-category-hardSkills").innerText()
    ).toMatch(/issues?/);
    expect(await section.innerText()).toContain("Not on the CV: GraphQL");
    expect(await section.innerText()).toContain("A guide, not a target");
    await page.context().close();
  });

  it("keeps the first scan and shows the change after the CV is edited", async () => {
    const page = await open(1440, 900);
    const section = page.getByRole("region", { name: "ATS score" });
    await section.getByRole("button", { name: /Analyse (CV|again)/ }).click();
    const before = Number(
      (
        await section
          .getByRole("img", { name: /^ATS score \d+/ })
          .getAttribute("aria-label")
      )?.match(/ATS score (\d+)/)?.[1]
    );
    // add what the advert asks for, with a number, then open the page again
    const edited = sampleFile();
    const experience = edited.vault.sections.find(
      (s) => s.type === "experience"
    )!;
    experience.items[1].fields.description =
      "Built GraphQL queries and Jest tests that raised coverage from 30% to 80%\nCut load time by 40% for 12 teams";
    await fetch(`${app.apiUrl}/api/vault`, {
      method: "PUT",
      // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edited),
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await section.getByRole("status").waitFor();
    await section.getByRole("button", { name: "Analyse again" }).click();
    await section.getByText("Since the first scan").waitFor();
    const label = await section
      .getByRole("img", { name: /from the first scan of/ })
      .getAttribute("aria-label");
    const after = Number(label?.match(/ATS score (\d+)/)?.[1]);
    expect(after).toBeGreaterThan(before);
    expect(label).toContain(`up ${after - before}`);
    expect(await section.innerText()).toContain("Not on the CV: nothing");
    await page.context().close();
  });

  it("is a tab with its own panel on a laptop, a tablet and a phone", async () => {
    for (const [width, height] of [
      [1024, 768],
      [820, 1180],
      [390, 844],
    ]) {
      const page = await open(width, height);
      const tab = page.getByRole("link", { name: /ATS score/ });
      expect(await tab.getAttribute("aria-current")).toBe("page");
      const panel = page.getByRole("region", { name: "ATS score" });
      await panel.getByRole("button", { name: /Analyse (CV|again)/ }).click();
      await panel.getByRole("img", { name: /^ATS score \d+/ }).waitFor();
      // no sideways scrolling of the window
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        )
      ).toBeLessThanOrEqual(0);
      await page
        .getByRole("button", { name: "How is this score calculated?" })
        .click();
      await page
        .getByRole("dialog")
        .getByText(/uses no AI/)
        .waitFor();
      await page.context().close();
    }
  });

  it("scores the words that are in the real PDF", async () => {
    // an earlier test edited the saved CV: start from the original again
    await fetch(`${app.apiUrl}/api/vault`, {
      method: "PUT",
      // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file),
    });
    const pdf = await readPdf(await app.pdf("main"));
    const variant = createDefaultVariant(file, "main");
    const result = scoreAts({
      document: render(file.vault, variant),
      profile: file.vault.profile,
      headline: file.vault.profile.headline,
      pageCount: pdf.pageCount,
      pageLimit: 1,
      linesOver: 0,
      isPhotoShown: false,
      requirements: analysis,
      today: new Date(),
    });
    // every word the score calls "on the CV" can be read from the PDF's text layer
    expect(result.covered.length).toBeGreaterThan(0);
    for (const word of result.covered) {
      expect(pdf.text.toLowerCase()).toContain(word.toLowerCase());
    }
    // and the ones it calls missing are not in it
    for (const word of result.missing) {
      expect(pdf.text.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});
