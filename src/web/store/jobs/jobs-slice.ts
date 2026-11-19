import {
  PayloadAction,
  createSelector,
  current,
  createSlice,
  nanoid,
} from "@reduxjs/toolkit";
import { Job } from "@custom-types/job-types";
import { Requirements } from "@custom-types/requirements-types";
import { Style } from "@custom-types/styles-types";
import { Template } from "@custom-types/template-types";
import {
  BulletSelection,
  FitLimitsValue,
  FitMode,
  FitTuning,
  ItemSelection,
  SkillDisplay,
  SkillGroupBy,
  Tone,
  Variant,
  VariantLayout,
} from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import {
  createVariant,
  updateBulletSelection,
  updateItemSelection as changeItemSelection,
} from "@shared/variant/variant-utils";
import {
  duplicateJob,
  duplicateTemplate,
  jobsUsingTemplate,
  resolveVariant,
  splitVariant,
  uniqueTemplateName,
} from "@shared/variant/template-job";
import { clampFitLimits } from "@shared/layout/fit";
import { createDefaultVault } from "@shared/vault/default-vault";
import { initialState as initialStyleState } from "@store/cv-data/cv-data-slice";

/** Longest id of a template made for a job */
const MAX_TEMPLATE_ID_LENGTH = 64;
/** Highest level a skill can have */
const MAX_SKILL_LEVEL = 5;
/**
 * State of the jobs slice: the templates (how a CV looks) and the jobs (what each one
 * shows, with the template it uses). The "variant" the rest of the app draws is
 * `resolveVariant(template, job)`, see `activeVariantSelector`. A variant id is a job id.
 */
export interface JobsState {
  templates: Template[];
  jobs: Job[];
  activeJobId: string;
  /**
   * True while the one job and template are only stand-ins made because nothing is saved yet:
   * the app shows "no job added", and they are never saved. Adding a job turns the stand-in
   * template into a real one and drops the stand-in job.
   */
  isPlaceholder: boolean;
  /** Same for the template: true until the first template is created (or the first job is added) */
  isTemplatePlaceholder: boolean;
}

const DEFAULT_VARIANT_ID = "default";

/** Id of the template made for a variant/job id (same rule as the server's legacy templates) */
export function templateIdFor(jobId: string): string {
  return `template-${jobId}`.slice(0, MAX_TEMPLATE_ID_LENGTH);
}

function createInitialState(): JobsState {
  const variant = createVariant(
    createDefaultVault(),
    initialStyleState.style,
    DEFAULT_VARIANT_ID,
    "Default"
  );
  const { template, job } = splitVariant(variant, templateIdFor(variant.id));
  return {
    templates: [{ ...template, name: "Template 1" }],
    jobs: [job],
    activeJobId: job.id,
    isPlaceholder: false,
    isTemplatePlaceholder: false,
  };
}

export const initialState: JobsState = createInitialState();

/**
 * Makes loaded templates and jobs usable: a job whose template is missing moves to the first
 * template, and no templates / no jobs gives the default ones. The active job stays if it exists.
 */
function normalise(
  templates: Template[],
  jobs: Job[],
  activeJobId: string
): Pick<
  JobsState,
  | "templates"
  | "jobs"
  | "activeJobId"
  | "isPlaceholder"
  | "isTemplatePlaceholder"
> {
  const fallback = createInitialState();
  const usableTemplates = templates.length ? templates : fallback.templates;
  const ids = new Set(usableTemplates.map((t) => t.id));
  const first = usableTemplates[0].id;
  const finalJobs = (jobs.length ? jobs : fallback.jobs).map((job) =>
    ids.has(job.templateId) ? job : { ...job, templateId: first }
  );
  return {
    templates: usableTemplates,
    jobs: finalJobs,
    activeJobId: finalJobs.some((j) => j.id === activeJobId)
      ? activeJobId
      : finalJobs[0].id,
    isPlaceholder: jobs.length === 0,
    isTemplatePlaceholder: templates.length === 0,
  };
}

/** The first real job replaces the stand-in one (its template stays and becomes real) */
function dropPlaceholderJob(state: JobsState): void {
  if (state.isPlaceholder) {
    state.jobs = [];
    state.isPlaceholder = false;
    state.isTemplatePlaceholder = false;
  }
}

function jobOf(state: JobsState, jobId: string): Job | undefined {
  return state.jobs.find((j) => j.id === jobId);
}

/** The template a job is drawn with (the first one if the job's is missing) */
function templateOf(state: JobsState, job: Job): Template {
  return (
    state.templates.find((t) => t.id === job.templateId) ?? state.templates[0]
  );
}

/** Changes the template of job `jobId`; also drops the stored auto-fit result of the jobs on it when asked */
function editTemplate(
  state: JobsState,
  jobId: string,
  change: (template: Template) => void,
  options: { shouldDropTuning?: boolean } = {}
): void {
  const job = jobOf(state, jobId);
  if (!job) {
    return;
  }
  const template = state.templates.find((t) => t.id === job.templateId);
  if (!template) {
    return;
  }
  change(template);
  if (options.shouldDropTuning) {
    for (const other of state.jobs) {
      if (other.templateId === template.id) {
        delete other.tuning;
      }
    }
  }
}

function editJob(
  state: JobsState,
  jobId: string,
  change: (job: Job) => void
): void {
  const job = jobOf(state, jobId);
  if (job) {
    change(job);
  }
}

/** Slice to access templates and jobs. Removing or hiding things here never touches the vault. */
const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    /**
     * Replaces everything with these variants, each split into its own template and job.
     * An empty list becomes the default template and job.
     */
    setVariants(state, action: PayloadAction<Variant[]>) {
      if (action.payload.length === 0) {
        return createInitialState();
      }
      const pairs = action.payload.map((variant) =>
        splitVariant(variant, templateIdFor(variant.id))
      );
      state.templates = pairs.map((pair) => pair.template);
      state.jobs = pairs.map((pair) => pair.job);
      state.isPlaceholder = false;
      if (!state.jobs.some((j) => j.id === state.activeJobId)) {
        state.activeJobId = state.jobs[0].id;
      }
    },

    /** Replaces everything, e.g. after loading templates and jobs from disk */
    setTemplatesAndJobs(
      state,
      action: PayloadAction<{ templates: Template[]; jobs: Job[] }>
    ) {
      Object.assign(
        state,
        normalise(
          action.payload.templates,
          action.payload.jobs,
          state.activeJobId
        )
      );
    },

    /** Marks only the current job as a stand-in (saved templates stay real) */
    markJobPlaceholder(state) {
      state.isPlaceholder = true;
    },

    /** Marks the current job and template as stand-ins (nothing is saved yet) */
    markPlaceholder(state) {
      state.isPlaceholder = true;
      state.isTemplatePlaceholder = true;
    },

    /**
     * A new job. It shares a template instead of getting a copy: the one given by `templateId`,
     * else the template of the active job, so a change of that template reaches the new job too.
     * Make a template first with `addTemplate` for a job that needs its own look.
     */
    createJob: {
      reducer(
        state,
        action: PayloadAction<{
          job: Job;
          templateId?: string;
        }>
      ) {
        const wanted = action.payload.templateId;
        const templateId = state.templates.some((t) => t.id === wanted)
          ? (wanted as string)
          : templateOf(state, jobOf(state, state.activeJobId) ?? state.jobs[0])
              .id;
        dropPlaceholderJob(state);
        state.jobs.push({ ...action.payload.job, templateId });
        state.activeJobId = action.payload.job.id;
      },
      prepare(input: {
        vault: Vault;
        style: Style;
        name: string;
        id?: string;
        templateId?: string;
      }) {
        const id = input.id ?? nanoid();
        const { job } = splitVariant(
          createVariant(input.vault, input.style, id, input.name),
          templateIdFor(id)
        );
        return { payload: { job, templateId: input.templateId } };
      },
    },

    /** A new template with the look of `sourceId` (default: the template of the active job). No job moves to it. */
    addTemplate: {
      reducer(
        state,
        action: PayloadAction<{
          id: string;
          name: string;
          subtitle?: string;
          sourceId?: string;
          layout?: VariantLayout;
          colors?: { text: string; secondary: string; accent?: string };
        }>
      ) {
        const source =
          state.templates.find((t) => t.id === action.payload.sourceId) ??
          templateOf(state, jobOf(state, state.activeJobId) ?? state.jobs[0]);
        const created = duplicateTemplate(
          current(source),
          action.payload.id,
          // names stay unique, also when a caller forgot to check
          uniqueTemplateName(state.templates, action.payload.name)
        );
        const subtitle = action.payload.subtitle?.trim();
        if (subtitle) {
          created.subtitle = subtitle;
        } else {
          delete created.subtitle;
        }
        if (action.payload.layout) {
          // a ready-made template (e.g. Developer) brings its own section placement
          created.layout = structuredClone(action.payload.layout);
        }
        if (action.payload.colors) {
          created.style.colors = { ...action.payload.colors };
        }
        if (state.isTemplatePlaceholder) {
          // the first real template replaces the stand-in; the stand-in job moves to it
          state.templates = [created];
          for (const job of state.jobs) {
            job.templateId = created.id;
          }
          state.isTemplatePlaceholder = false;
        } else {
          state.templates.push(created);
        }
      },
      prepare(input: {
        name: string;
        subtitle?: string;
        id?: string;
        sourceId?: string;
        layout?: VariantLayout;
        colors?: { text: string; secondary: string; accent?: string };
      }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
    },

    renameTemplate(
      state,
      action: PayloadAction<{ id: string; name: string; subtitle?: string }>
    ) {
      const template = state.templates.find((t) => t.id === action.payload.id);
      if (template) {
        template.name = action.payload.name;
        if (action.payload.subtitle !== undefined) {
          const subtitle = action.payload.subtitle.trim();
          if (subtitle) {
            template.subtitle = subtitle;
          } else {
            delete template.subtitle;
          }
        }
      }
    },

    /**
     * Deleting the last template is refused. Jobs on the template move to `moveJobsTo` (their
     * auto-fit result belonged to the old look, so it is dropped); without a valid target a
     * template that jobs still use stays. Applications are frozen copies and are not affected.
     */
    deleteTemplate(
      state,
      action: PayloadAction<{ id: string; moveJobsTo?: string }>
    ) {
      const { id, moveJobsTo } = action.payload;
      if (state.templates.length <= 1) {
        return;
      }
      const users = jobsUsingTemplate(state.jobs, id);
      if (users.length > 0) {
        if (
          !moveJobsTo ||
          moveJobsTo === id ||
          !state.templates.some((t) => t.id === moveJobsTo)
        ) {
          return;
        }
        for (const job of state.jobs) {
          if (job.templateId === id) {
            job.templateId = moveJobsTo;
            delete job.tuning;
          }
        }
      }
      state.templates = state.templates.filter((t) => t.id !== id);
    },

    /** A new job that shows what the source shows and shares its template (changing the look changes both) */
    copyJob: {
      reducer(
        state,
        action: PayloadAction<{ sourceId: string; id: string; name?: string }>
      ) {
        const draft = jobOf(state, action.payload.sourceId);
        if (!draft) {
          return;
        }
        const source = current(draft);
        const name = action.payload.name ?? `${source.name} (copy)`;
        const copy = {
          ...duplicateJob(source, action.payload.id, name),
          // a copy keeps the record of the proposal it came from, as variants always did
          ...(source.tailor ? { tailor: structuredClone(source.tailor) } : {}),
        };
        dropPlaceholderJob(state);
        state.jobs.push(copy);
        state.activeJobId = copy.id;
      },
      prepare(input: { sourceId: string; name?: string; id?: string }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
    },

    /** Edits the details of a job (what it is for); only the given fields change */
    setJobDetails(
      state,
      action: PayloadAction<{
        id: string;
        details: Partial<
          Pick<
            Job,
            | "name"
            | "company"
            | "role"
            | "url"
            | "jobAd"
            | "stage"
            | "salaryMin"
            | "salaryMax"
            | "salaryIsRange"
            | "expectedSalary"
            | "feeling"
            | "chance"
            | "location"
            | "workMode"
            | "employmentType"
          >
        >;
      }>
    ) {
      editJob(state, action.payload.id, (job) => {
        Object.assign(job, action.payload.details);
      });
    },

    renameJob(state, action: PayloadAction<{ id: string; name: string }>) {
      editJob(state, action.payload.id, (job) => {
        job.name = action.payload.name;
      });
    },

    /** The last job cannot be deleted, so there is always one to show. Its template stays: templates are reusable and are deleted on their own. */
    deleteJob(state, action: PayloadAction<{ id: string }>) {
      const job = jobOf(state, action.payload.id);
      if (!job || state.jobs.length <= 1) {
        return;
      }
      state.jobs = state.jobs.filter((j) => j.id !== job.id);
      if (state.activeJobId === job.id) {
        state.activeJobId = state.jobs[0].id;
      }
    },

    /** Moves a job to another existing template. Its own choices are kept. */
    setJobTemplate(
      state,
      action: PayloadAction<{ jobId: string; templateId: string }>
    ) {
      const { jobId, templateId } = action.payload;
      if (!state.templates.some((t) => t.id === templateId)) {
        return;
      }
      editJob(state, jobId, (job) => {
        job.templateId = templateId;
      });
    },

    setActiveJob(state, action: PayloadAction<{ id: string }>) {
      if (state.jobs.some((j) => j.id === action.payload.id)) {
        state.activeJobId = action.payload.id;
      }
    },

    /** What one item shows in a job. `jobId` is the job's id. */
    setItemSelection(
      state,
      action: PayloadAction<{
        jobId: string;
        itemId: string;
        change: Partial<ItemSelection>;
      }>
    ) {
      const { jobId, itemId, change } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === jobId);
      if (index >= 0) {
        state.jobs[index] = changeItemSelection(
          state.jobs[index],
          itemId,
          change
        );
      }
    },

    setBulletSelection(
      state,
      action: PayloadAction<{
        jobId: string;
        itemId: string;
        bulletId: string;
        change: Partial<BulletSelection>;
      }>
    ) {
      const { jobId, itemId, bulletId, change } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === jobId);
      if (index >= 0) {
        state.jobs[index] = updateBulletSelection(
          state.jobs[index],
          itemId,
          bulletId,
          change
        );
      }
    },

    /** Sets the position of several items at once, see `computeItemOrders` */
    setItemOrders(
      state,
      action: PayloadAction<{
        jobId: string;
        orders: Record<string, number>;
      }>
    ) {
      const index = state.jobs.findIndex((j) => j.id === action.payload.jobId);
      if (index < 0) {
        return;
      }
      let job = state.jobs[index];
      for (const [itemId, order] of Object.entries(action.payload.orders)) {
        job = changeItemSelection(job, itemId, { order });
      }
      state.jobs[index] = job;
    },

    /** Sets the position of several bullets of one item at once, see `computeBulletOrders` */
    setBulletOrders(
      state,
      action: PayloadAction<{
        jobId: string;
        itemId: string;
        orders: Record<string, number>;
      }>
    ) {
      const { jobId, itemId, orders } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === jobId);
      if (index < 0) {
        return;
      }
      let job = state.jobs[index];
      for (const [bulletId, order] of Object.entries(orders)) {
        job = updateBulletSelection(job, itemId, bulletId, { order });
      }
      state.jobs[index] = job;
    },

    setTone(state, action: PayloadAction<{ id: string; tone: Tone }>) {
      editJob(state, action.payload.id, (job) => {
        job.tone = action.payload.tone;
      });
    },

    /** Shows or hides a whole vault section in one job (the vault and the template are not touched) */
    setSectionShown(
      state,
      action: PayloadAction<{
        jobId: string;
        sectionId: string;
        isShown: boolean;
      }>
    ) {
      const { jobId, sectionId, isShown } = action.payload;
      editJob(state, jobId, (job) => {
        const hidden = new Set(job.hiddenSections ?? []);
        if (isShown) {
          hidden.delete(sectionId);
        } else {
          hidden.add(sectionId);
        }
        if (hidden.size === 0) {
          delete job.hiddenSections;
        } else {
          job.hiddenSections = [...hidden];
        }
      });
    },

    /** The job title one job shows; undefined goes back to the vault's Job Title */
    setJobHeadline(
      state,
      action: PayloadAction<{ jobId: string; headline: string | undefined }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        if (action.payload.headline === undefined) {
          delete job.headline;
        } else {
          job.headline = action.payload.headline;
        }
      });
    },

    /** How well each job title fits one job (from "Score job titles"); only the scores change */
    setTitleScores(
      state,
      action: PayloadAction<{
        jobId: string;
        scores: { title: string; relevance: number; reason: string }[];
      }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        job.titleScores = {
          ...job.titleScores,
          ...Object.fromEntries(
            action.payload.scores.map((score) => [
              score.title,
              { relevance: score.relevance, reason: score.reason },
            ])
          ),
        };
      });
    },

    /** The order of the links for one job (link ids); the vault list is not touched */
    setLinkOrder(
      state,
      action: PayloadAction<{ jobId: string; order: string[] }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        job.linkOrder = [...action.payload.order];
      });
    },

    /** Shows or hides one link in this job; the vault list is not touched */
    setLinkShown(
      state,
      action: PayloadAction<{ jobId: string; linkId: string; isShown: boolean }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        const others = (job.hiddenLinks ?? []).filter(
          (id) => id !== action.payload.linkId
        );
        const next = action.payload.isShown
          ? others
          : [...others, action.payload.linkId];
        if (next.length === 0) {
          delete job.hiddenLinks;
        } else {
          job.hiddenLinks = next;
        }
      });
    },

    /** How skills are shown with the job's template: level style, columns, minimum level */
    setSkillStyle(
      state,
      action: PayloadAction<{
        id: string;
        display?: SkillDisplay;
        columns?: 1 | 2;
        minLevel?: number;
        groupBy?: SkillGroupBy;
      }>
    ) {
      const { display, columns, minLevel, groupBy } = action.payload;
      editTemplate(state, action.payload.id, (template) => {
        if (groupBy !== undefined) {
          template.skillGroupBy = groupBy;
        }
        if (display !== undefined) {
          template.skillDisplay = display;
        }
        if (columns !== undefined) {
          template.skillColumns = columns;
        }
        if (minLevel !== undefined) {
          const level = Math.round(minLevel);
          if (level <= 0) {
            delete template.skillMinLevel;
          } else {
            template.skillMinLevel = Math.min(level, MAX_SKILL_LEVEL);
          }
        }
      });
    },

    setPageLimit(
      state,
      action: PayloadAction<{ id: string; pageLimit: number }>
    ) {
      editJob(state, action.payload.id, (job) => {
        job.pageLimit = action.payload.pageLimit;
      });
    },

    setAutoFit(
      state,
      action: PayloadAction<{
        id: string;
        isAutoFit: boolean;
        fitMode?: FitMode;
      }>
    ) {
      editTemplate(
        state,
        action.payload.id,
        (template) => {
          template.isAutoFit = action.payload.isAutoFit;
          if (action.payload.fitMode) {
            template.fitMode = action.payload.fitMode;
          }
        },
        { shouldDropTuning: !action.payload.isAutoFit }
      );
    },

    setFitLimits(
      state,
      action: PayloadAction<{ id: string; limits: FitLimitsValue }>
    ) {
      editTemplate(
        state,
        action.payload.id,
        (template) => {
          template.fitLimits = clampFitLimits(action.payload.limits);
        },
        // The old result no longer follows the limits
        { shouldDropTuning: true }
      );
    },

    /**
     * Puts AI relevance scores (0-100, with a reason) on the entries of one section and on their
     * bullets (skills). Only relevance and its reason change: nothing is shown, hidden or moved.
     * One action, so one undo step.
     */
    setSectionScores(
      state,
      action: PayloadAction<{
        jobId: string;
        scores: {
          itemId: string;
          relevance: number;
          reason: string;
          bullets: { bulletId: string; relevance: number; reason: string }[];
        }[];
      }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        let next = job;
        for (const score of action.payload.scores) {
          next = changeItemSelection(next, score.itemId, {
            relevance: score.relevance,
            relevanceReason: score.reason,
          });
          for (const bullet of score.bullets) {
            next = updateBulletSelection(next, score.itemId, bullet.bulletId, {
              relevance: bullet.relevance,
              relevanceReason: bullet.reason,
            });
          }
        }
        Object.assign(job, next);
      });
    },

    /** Stores what "Analyse job description" found (and the advert it read) on the job */
    setJobAnalysis(
      state,
      action: PayloadAction<{
        jobId: string;
        jobAd: string;
        analysis: Requirements;
      }>
    ) {
      editJob(state, action.payload.jobId, (job) => {
        job.jobAd = action.payload.jobAd;
        job.analysis = action.payload.analysis;
      });
    },

    /** Stores the result of an auto-fit run in the job (null clears it) */
    setTuning(
      state,
      action: PayloadAction<{ id: string; tuning: FitTuning | null }>
    ) {
      editJob(state, action.payload.id, (job) => {
        if (action.payload.tuning) {
          job.tuning = action.payload.tuning;
        } else {
          delete job.tuning;
        }
      });
    },

    /** Stores the page layout and style the editor shows into a template (by template id) */
    setTemplateLook(
      state,
      action: PayloadAction<{
        templateId: string;
        layout: VariantLayout;
        style: Style;
      }>
    ) {
      const template = state.templates.find(
        (t) => t.id === action.payload.templateId
      );
      if (template) {
        template.layout = action.payload.layout;
        template.style = action.payload.style;
      }
    },

    /** Stores the page layout and style the editor currently shows into the job's template */
    setTemplateAppearance(
      state,
      action: PayloadAction<{ id: string; layout: VariantLayout; style: Style }>
    ) {
      editTemplate(state, action.payload.id, (template) => {
        template.layout = action.payload.layout;
        template.style = action.payload.style;
      });
    },
  },
});

export const jobsReducer = jobsSlice.reducer;

export const {
  markPlaceholder,
  markJobPlaceholder,
  setVariants,
  setTemplatesAndJobs,
  createJob,
  copyJob,
  renameJob,
  setJobDetails,
  deleteJob,
  addTemplate,
  renameTemplate,
  deleteTemplate,
  setJobTemplate,
  setActiveJob,
  setItemSelection,
  setBulletSelection,
  setBulletOrders,
  setItemOrders,
  setTemplateAppearance,
  setTemplateLook,
  setTone,
  setSectionScores,
  setJobAnalysis,
  setSectionShown,
  setLinkOrder,
  setLinkShown,
  setJobHeadline,
  setTitleScores,
  setPageLimit,
  setSkillStyle,
  setAutoFit,
  setFitLimits,
  setTuning,
} = jobsSlice.actions;

/** `resolveVariant` that returns the same object for the same template and job objects */
const resolvedCache = new WeakMap<Template, WeakMap<Job, Variant>>();

function resolveCached(template: Template, job: Job): Variant {
  let byJob = resolvedCache.get(template);
  if (!byJob) {
    byJob = new WeakMap();
    resolvedCache.set(template, byJob);
  }
  let variant = byJob.get(job);
  if (!variant) {
    variant = resolveVariant(template, job);
    byJob.set(job, variant);
  }
  return variant;
}

type SliceRoot = { jobs: JobsState };

export function activeJobSelector(state: SliceRoot): Job {
  const { jobs, activeJobId } = state.jobs;
  return jobs.find((j) => j.id === activeJobId) ?? jobs[0];
}

/** The template of the active job */
export function activeTemplateSelector(state: SliceRoot): Template {
  const { templates } = state.jobs;
  const job = activeJobSelector(state);
  return templates.find((t) => t.id === job.templateId) ?? templates[0];
}

/**
 * The template the Page layout / Style settings editors work on: the one named in
 * `app.editedTemplateId` when it exists, otherwise the active job's template.
 */
export function editedTemplateSelector(
  state: SliceRoot & { app: { editedTemplateId: string | null } }
): Template {
  const { templates } = state.jobs;
  return (
    templates.find((t) => t.id === state.app.editedTemplateId) ??
    activeTemplateSelector(state)
  );
}

export function isTemplatePlaceholderSelector(state: SliceRoot): boolean {
  return state.jobs.isTemplatePlaceholder;
}

export function isPlaceholderSelector(state: SliceRoot): boolean {
  return state.jobs.isPlaceholder;
}

/** What is written on Save: nothing while the job and template are only stand-ins */
export function savableOf(jobs: JobsState): {
  templates: Template[];
  jobs: Job[];
} {
  return {
    templates: jobs.isTemplatePlaceholder ? [] : jobs.templates,
    jobs: jobs.isPlaceholder ? [] : jobs.jobs,
  };
}

export function templatesSelector(state: SliceRoot): Template[] {
  return state.jobs.templates;
}

export function jobsSelector(state: SliceRoot): Job[] {
  return state.jobs.jobs;
}

/**
 * Every job drawn with its template, as the variant the rest of the app uses. Memoised:
 * the same array while templates and jobs are the same objects.
 */
export const variantsSelector: (state: SliceRoot) => Variant[] = createSelector(
  [templatesSelector, jobsSelector],
  (templates, jobs) =>
    jobs.map((job) =>
      resolveCached(
        templates.find((t) => t.id === job.templateId) ?? templates[0],
        job
      )
    )
);

/**
 * The active variant = `resolveVariant(template of the active job, active job)`. Memoised:
 * the same object until the job or its template changes (editing another job keeps it).
 */
export const activeVariantSelector: (state: SliceRoot) => Variant =
  createSelector([activeTemplateSelector, activeJobSelector], (template, job) =>
    resolveCached(template, job)
  );
