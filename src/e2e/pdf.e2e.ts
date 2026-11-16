import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Variant } from "@custom-types/variant-types";
import {
  createVariant,
  updateBulletSelection,
  updateItemSelection,
} from "@shared/variant/variant-utils";
import { splitVariant } from "@shared/variant/template-job";
import { RunningApp, startApp } from "@e2e/start-app";
import { readPdf } from "@e2e/read-pdf";
import { longFile, makeExperience, sampleFile } from "@e2e/fixtures";

/** A4 in points, with a little tolerance for rounding */
const A4_PT = { width: 595.28, height: 841.89 };
const TOLERANCE_PT = 1.5;

const EXTRA_JOBS = 7;

let app: RunningApp;
const file = longFile(EXTRA_JOBS);
const extraIds = Array.from(
  { length: EXTRA_JOBS },
  (_v, i) => makeExperience(i + 1).id
);

function blank(id: string, name: string): Variant {
  // everything the vault shows, as a single column
  return createVariant(file.vault, file.style, id, name);
}

/** Hides every extra job except the ones listed */
function onlyJobs(variant: Variant, keep: string[]): Variant {
  return extraIds
    .filter((id) => !keep.includes(id))
    .reduce(
      (current, id) => updateItemSelection(current, id, { isVisible: false }),
      variant
    );
}

beforeAll(async () => {
  app = await startApp();
  const short = onlyJobs(blank("short", "Short"), []);
  const long = blank("long", "Long");

  // changes only how the CV is shown: order, wording, hidden bullet
  let tailored = onlyJobs(blank("tailored", "Tailored"), ["long-1", "long-2"]);
  tailored = updateItemSelection(tailored, "long-2", {
    isVisible: true,
    order: 0,
  });
  tailored = updateItemSelection(tailored, "long-1", {
    isVisible: true,
    order: 1,
  });
  tailored = updateBulletSelection(tailored, "long-1", "long-1-b2", {
    isVisible: false,
  });

  await app.seed(file, [short, long, tailored]);
});

afterAll(async () => {
  await app?.close();
});

describe("PDF of a job (real Chromium)", () => {
  it("is one A4 page with a text layer when the content fits", async () => {
    const pdf = await readPdf(await app.pdf("short"));

    expect(pdf.pageCount).toBe(1);
    expect(Math.abs(pdf.pageSize.width - A4_PT.width)).toBeLessThan(
      TOLERANCE_PT
    );
    expect(Math.abs(pdf.pageSize.height - A4_PT.height)).toBeLessThan(
      TOLERANCE_PT
    );
    for (const text of [
      "Jane Doe",
      "Professional Summary",
      "Work Experience",
      "Senior Software Developer",
      "Example Ltd",
      "BSc Computer Science",
      "University of Example",
    ]) {
      expect(pdf.text).toContain(text);
    }
  });

  it("leaves out what the job hides", async () => {
    const pdf = await readPdf(await app.pdf("short"));

    // exp-3 is hidden in the sample, and the extra jobs are hidden in this variant
    expect(pdf.text).not.toContain("Demo Co");
    expect(pdf.text).not.toContain("Engineer Number");
  });

  it("runs onto a second page, without losing anything, when there is more content", async () => {
    const pdf = await readPdf(await app.pdf("long"));

    expect(pdf.pageCount).toBe(2);
    expect(pdf.text).toContain("Jane Doe");
    // the first and the last job are both there
    expect(pdf.text).toContain("Engineer Number 1");
    expect(pdf.text).toContain(`Engineer Number ${EXTRA_JOBS}`);
    expect(pdf.text).toContain("University of Example");
  });

  it("follows the job's order, wording and hidden bullets", async () => {
    const { text } = await readPdf(await app.pdf("tailored"));

    expect(text.indexOf("Engineer Number 2")).toBeGreaterThan(-1);
    expect(text.indexOf("Engineer Number 2")).toBeLessThan(
      text.indexOf("Engineer Number 1")
    );
    expect(text).toContain("Delivered result 1 of job 1");
    expect(text).not.toContain("Delivered result 2 of job 1");
    expect(text).toContain("Delivered result 2 of job 2");
  });

  it("refuses a job that is not saved", async () => {
    await expect(app.pdf("nope")).rejects.toThrow();
  });
});

describe("PDF of a job (real Chromium)", () => {
  it("draws jobs saved as templates and jobs, two jobs on one template", async () => {
    // one template, two jobs that show different things
    const base = onlyJobs(blank("job-a", "Job A"), []);
    const { template, job: jobA } = splitVariant(base, "tpl-shared");
    const { job: jobB } = splitVariant(
      onlyJobs(blank("job-b", "Job B"), ["long-1"]),
      "tpl-shared"
    );
    await app.seedJobs(file, [template], [jobA, jobB]);

    // the API route takes the job id and the print page loads the job with its template
    const a = await readPdf(await app.pdfOfJob("job-a"));
    const b = await readPdf(await app.pdfOfJob("job-b"));

    expect(a.pageCount).toBe(1);
    expect(a.text).toContain("Jane Doe");
    expect(a.text).not.toContain("Engineer Number 1");
    expect(b.text).toContain("Engineer Number 1");
    expect(b.text).not.toContain("Engineer Number 2");
  });
});

describe("PDF of publications (#476)", () => {
  let pubsApp: RunningApp;

  beforeAll(async () => {
    pubsApp = await startApp();
    const pubsFile = sampleFile();
    pubsFile.vault.sections.push({
      id: "pubs",
      type: "publications",
      title: "Publications",
      items: [
        {
          id: "pub-old",
          fields: {
            title: "Older paper",
            authors: "Doe, J., Shahi, M.",
            journal: "Journal of Old Things",
            year: "2019",
          },
          bullets: [],
          tags: [],
          shouldShow: true,
        },
        {
          id: "pub-new",
          fields: {
            title: "Newer paper",
            authors: "Doe, J., Shahi, M.",
            journal: "Journal of New Things",
            year: "2024",
            link: "10.1234/abcd",
          },
          bullets: [],
          tags: [],
          shouldShow: true,
        },
      ],
    });
    pubsFile.vault.profile.citationName = "Doe, J.";
    const variant = createVariant(pubsFile.vault, pubsFile.style, "pubs", "P");
    variant.layout.fullWidth.push("pubs");
    await pubsApp.seed(pubsFile, [variant]);
  });

  afterAll(async () => {
    await pubsApp?.close();
  });

  it("has the link as visible text at the end of the line, and the newest first", async () => {
    const pdf = await readPdf(await pubsApp.pdf("pubs"));
    expect(pdf.text).toContain("doi.org/10.1234/abcd");
    expect(pdf.text.indexOf("Newer paper")).toBeGreaterThan(-1);
    expect(pdf.text.indexOf("Newer paper")).toBeLessThan(
      pdf.text.indexOf("Older paper")
    );
  });
});
