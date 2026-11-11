import {
  Job,
  CURRENT_JOB_VERSION,
  DEFAULT_PAGE_LIMIT,
} from "@custom-types/job-types";
import {
  CURRENT_TEMPLATE_VERSION,
  Template,
} from "@custom-types/template-types";
import { CURRENT_VARIANT_VERSION, Variant } from "@custom-types/variant-types";

/** Fields that belong to the template; everything else of a variant belongs to the job */
const TEMPLATE_KEYS = [
  "layout",
  "style",
  "isAutoFit",
  "fitMode",
  "fitLimits",
  "skillDisplay",
  "skillGroupBy",
  "skillColumns",
  "skillMinLevel",
] as const;

/** Optional fields of a job that are copied only when set */
const JOB_OPTIONAL_KEYS = [
  "pageLimit",
  "hiddenSections",
  "headline",
  "linkOrder",
  "hiddenLinks",
  "tuning",
  "tailor",
] as const;

/** Length of "YYYY-MM-DD" */
const DAY_LENGTH = 10;

/** Today as "YYYY-MM-DD" */
export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, DAY_LENGTH);
}

/** Copies the listed keys that have a value (no `undefined` keys, no shared references) */
function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[]
): Pick<T, K> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = structuredClone(source[key]);
    }
  }
  return result as Pick<T, K>;
}

/**
 * The variant a job shows when drawn with its template: the shape `render`, the pagination
 * and the PDF already use. Its id is the job's id and its name is the job's name.
 */
export function resolveVariant(template: Template, job: Job): Variant {
  return {
    id: job.id,
    version: CURRENT_VARIANT_VERSION,
    name: job.name,
    tone: job.tone,
    selection: structuredClone(job.selection),
    ...pick(template, TEMPLATE_KEYS),
    ...pick(job, JOB_OPTIONAL_KEYS),
    pageLimit: job.pageLimit ?? DEFAULT_PAGE_LIMIT,
  };
}

/**
 * Splits a variant into the template (look) and the job (what is shown). Both get the
 * variant's name. `resolveVariant` turns them back into the same variant.
 */
export function splitVariant(
  variant: Variant,
  templateId: string,
  createdAt: string = today()
): { template: Template; job: Job } {
  const template = {
    id: templateId,
    version: CURRENT_TEMPLATE_VERSION,
    name: variant.name,
    ...pick(variant, TEMPLATE_KEYS),
  };
  const job = {
    id: variant.id,
    version: CURRENT_JOB_VERSION,
    name: variant.name,
    templateId,
    createdAt,
    tone: variant.tone,
    selection: structuredClone(variant.selection),
    ...pick(variant, JOB_OPTIONAL_KEYS),
  };
  return { template, job };
}

/** A new template with the look of `source` and nothing shared with it */
export function duplicateTemplate(
  source: Template,
  id: string,
  name: string,
  createdAt: string = today()
): Template {
  return { ...structuredClone(source), id, name, createdAt };
}

/**
 * A new job that shows what `source` shows, on the same template unless `templateId` is given.
 * The tailor record is not copied: it describes the job it was made for.
 */
export function duplicateJob(
  source: Job,
  id: string,
  name: string,
  options: { templateId?: string; createdAt?: string } = {}
): Job {
  const copy = structuredClone(source);
  delete copy.tailor;
  return {
    ...copy,
    id,
    name,
    templateId: options.templateId ?? source.templateId,
    createdAt: options.createdAt ?? today(),
  };
}

/** Moves a job to another template. Its choices are kept. */
export function changeJobTemplate(job: Job, templateId: string): Job {
  return { ...structuredClone(job), templateId };
}

/** Ids of the jobs that use a template, so a used template is not deleted */
export function jobsUsingTemplate(jobs: Job[], templateId: string): Job[] {
  return jobs.filter((job) => job.templateId === templateId);
}
