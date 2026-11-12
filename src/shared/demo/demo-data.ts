import sample from "@fixtures/sample-cv.json";
import { CvFile } from "@custom-types/vault-types";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { splitVariant } from "@shared/variant/template-job";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import {
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";

export interface DemoData {
  file: CvFile;
  templates: Template[];
  jobs: Job[];
}

const SINGLE_ID = "demo-template-single";
const TWO_ID = "demo-template-two";
const JOB_ID = "demo-job";
const DEMO_DAY = "2026-01-01";

/**
 * A fake person with a vault, two templates (single and two columns) and one job on the
 * single-column template. Built fresh on every call, so "Reset demo" starts clean. Lives only
 * in memory: it is never written to the data folder.
 */
export function buildDemo(): DemoData {
  const file = migrateCvFile(structuredClone(sample));
  const { sections } = file.vault;
  const base = createDefaultVariant(file, JOB_ID, singleColumnLayout(sections));
  const single = splitVariant(
    { ...base, name: "Demo - Software engineer" },
    SINGLE_ID,
    DEMO_DAY
  );
  const two = splitVariant(
    {
      ...base,
      id: "demo-unused",
      name: "Demo two columns",
      layout: twoColumnLayout(sections),
    },
    TWO_ID,
    DEMO_DAY
  );
  return {
    file,
    templates: [
      { ...single.template, name: "Demo single column" },
      two.template,
    ],
    jobs: [single.job],
  };
}
