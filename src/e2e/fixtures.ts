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
