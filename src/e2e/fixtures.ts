import { Page } from "playwright";
import sample from "@fixtures/sample-cv.json";
import { Item, CvFile } from "@custom-types/vault-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";

/** The fake sample CV, in the current format */
export function sampleFile(): CvFile {
  return migrateCvFile(sample);
}

const BULLETS_PER_JOB = 3;

/** An experience with three bullets, all with text that is easy to look for */
export function makeExperience(n: number): Item {
  return {
    id: `long-${n}`,
    fields: {
      jobTitle: `Engineer Number ${n}`,
      company: `Company ${n} Ltd`,
      location: "Leeds, UK",
      startDate: "2010-01-01",
      endDate: "2012-01-01",
    },
    bullets: Array.from({ length: BULLETS_PER_JOB }, (_v, i) => i + 1).map(
      (b) => ({
        id: `long-${n}-b${b}`,
        text: `Delivered result ${b} of job ${n} with measurable impact on the team`,
        tags: [],
      })
    ),
    tags: [],
    shouldShow: true,
  };
}

/** The sample CV with `count` more experiences, so it needs more than one page */
export function longFile(count: number): CvFile {
  const file = sampleFile();
  const experience = file.vault.sections.find((s) => s.type === "experience");
  if (!experience) {
    throw new Error("The sample needs an experience section.");
  }
  for (let n = 1; n <= count; n += 1) {
    experience.items.push(makeExperience(n));
  }
  return file;
}

/**
 * A tutorial opens over a page the first time it is visited and blocks every click under it.
 * Tests are about the pages, so they start with all the tutorials seen (the tutorials have
 * their own tests).
 */
export async function skipTutorials(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const key of [
      "squeezy-cv-vault-tutorial-seen",
      "squeezy-cv-template-tutorial-seen",
      "squeezy-cv-apply-tutorial-seen",
      "squeezy-cv-applications-tutorial-seen",
      "squeezy-cv-ai-tutorial-seen",
    ]) {
      localStorage.setItem(key, "1");
    }
  });
}

/**
 * Answers an AI route. Every AI request is asked first what it would send (the header
 * `x-ai-preview`); for a local model that answer is all the app needs, then the real request
 * follows and gets `answer`. `onRequest` sees the body of the real one.
 */
export async function stubAiRoute(
  page: Page,
  url: string,
  answer: unknown,
  onRequest?: (body: unknown) => void
): Promise<void> {
  await page.route(url, (route) => {
    if (route.request().headers()["x-ai-preview"]) {
      return route.fulfill({
        json: { provider: "ollama", calls: [], terms: [], suggestions: [] },
      });
    }
    onRequest?.(route.request().postDataJSON());
    return route.fulfill({ json: answer });
  });
}

/**
 * Opens the CV page of the Apply tool ("Template & content") through the links, without
 * reloading the page (so unsaved edits stay).
 */
export async function openCvPage(page: Page): Promise<void> {
  await page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("link", { name: "Apply" })
    .click();
  await page
    .getByRole("navigation", { name: "Job application" })
    .getByRole("link", { name: /^Template & content/ })
    .click();
}
