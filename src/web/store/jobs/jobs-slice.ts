import {
  PayloadAction,
  createSelector,
  current,
  createSlice,
  nanoid,
} from "@reduxjs/toolkit";
import {
  changeSectionStyle,
  SectionStyleChange,
} from "@shared/variant/section-style";
import { Job } from "@custom-types/job-types";
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
} from "@shared/variant/template-job";
import { clampFitLimits } from "@shared/layout/fit";
import { createDefaultVault } from "@shared/vault/default-vault";
import { initialState as initialStyleState } from "@store/cv-data/cv-data-slice";

/**
 * State of the jobs slice: the templates (how a CV looks) and the jobs (what each one
 * shows, with the template it uses). The "variant" the rest of the app draws is
 * `resolveVariant(template, job)`, see `activeVariantSelector`. A variant id is a job id.
 */
export interface JobsState {
  templates: Template[];
  jobs: Job[];
  activeJobId: string;
}

const DEFAULT_VARIANT_ID = "default";

/** Id of the template made for a variant/job id (same rule as the server's legacy templates) */
export function templateIdFor(jobId: string): string {
  return `template-${jobId}`.slice(0, 64);
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
): Pick<JobsState, "templates" | "jobs" | "activeJobId"> {
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
  };
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
          sourceId?: string;
        }>
      ) {
        const source =
          state.templates.find((t) => t.id === action.payload.sourceId) ??
          templateOf(state, jobOf(state, state.activeJobId) ?? state.jobs[0]);
        state.templates.push(
          duplicateTemplate(
            current(source),
            action.payload.id,
            action.payload.name
          )
        );
      },
      prepare(input: { name: string; id?: string; sourceId?: string }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
    },

    renameTemplate(state, action: PayloadAction<{ id: string; name: string }>) {
      const template = state.templates.find((t) => t.id === action.payload.id);
      if (template) {
        template.name = action.payload.name;
      }
    },

    /** Deleting a template a job uses is refused (move the jobs first), and so is deleting the last one */
    deleteTemplate(state, action: PayloadAction<{ id: string }>) {
      if (
        state.templates.length <= 1 ||
        jobsUsingTemplate(state.jobs, action.payload.id).length > 0
      ) {
        return;
      }
      state.templates = state.templates.filter(
        (t) => t.id !== action.payload.id
      );
    },

    /**
     * A job made by tailoring (#170): it uses an existing template, or the template copy that
     * comes with it. Nothing existing is changed. The job becomes the active one.
     */
    insertTailoredJob(
      state,
      action: PayloadAction<{ job: Job; template?: Template }>
    ) {
      const { job, template } = action.payload;
      if (template) {
        state.templates.push(template);
      }
      if (state.templates.some((t) => t.id === job.templateId)) {
        state.jobs.push(job);
        state.activeJobId = job.id;
      }
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
        state.jobs.push(copy);
        state.activeJobId = copy.id;
      },
      prepare(input: { sourceId: string; name?: string; id?: string }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
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

    /** Style of one section in the job's template; a null value goes back to the global style */
    setSectionStyle(
      state,
      action: PayloadAction<{
        id: string;
        sectionId: string;
        change: SectionStyleChange;
      }>
    ) {
      const { sectionId, change } = action.payload;
      editTemplate(
        state,
        action.payload.id,
        (template) => {
          const next = changeSectionStyle(
            template.sectionStyles?.[sectionId],
            change
          );
          const styles = { ...template.sectionStyles };
          if (next) {
            styles[sectionId] = next;
          } else {
            delete styles[sectionId];
          }
          if (Object.keys(styles).length === 0) {
            delete template.sectionStyles;
          } else {
            template.sectionStyles = styles;
          }
        },
        { shouldDropTuning: true }
      );
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
            template.skillMinLevel = Math.min(level, 5);
          }
        }
      });
    },

    setPageLimit(
      state,
      action: PayloadAction<{ id: string; pageLimit: number }>
    ) {
      editTemplate(state, action.payload.id, (template) => {
        template.pageLimit = action.payload.pageLimit;
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
  setVariants,
  setTemplatesAndJobs,
  createJob,
  insertTailoredJob,
  copyJob,
  renameJob,
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
  setTone,
  setSectionShown,
  setPageLimit,
  setSkillStyle,
  setSectionStyle,
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
