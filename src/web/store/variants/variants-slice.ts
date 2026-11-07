import {
  PayloadAction,
  createSelector,
  current,
  createSlice,
  nanoid,
} from "@reduxjs/toolkit";
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
  resolveVariant,
  splitVariant,
} from "@shared/variant/template-job";
import { NO_LOCKS, VariantLocks } from "@shared/variant/variant-lock";
import { clampFitLimits } from "@shared/layout/fit";
import { createDefaultVault } from "@shared/vault/default-vault";
import { initialState as initialStyleState } from "@store/cv-data/cv-data-slice";

/**
 * State of the variants slice: the templates (how a CV looks) and the jobs (what each one
 * shows, with the template it uses). The "variant" the rest of the app draws is
 * `resolveVariant(template, job)`, see `activeVariantSelector`. A variant id is a job id.
 */
export interface VariantsState {
  templates: Template[];
  jobs: Job[];
  activeJobId: string;

  /** Which jobs were sent (derived from the applications, see `computeVariantLocks`) */
  locks: VariantLocks;

  /** Locked jobs the user approved editing in this session. Cleared when they are saved or re-locked. */
  unlockedIds: string[];
}

const DEFAULT_VARIANT_ID = "default";

/** Id of the template made for a variant/job id (same rule as the server's legacy templates) */
export function templateIdFor(jobId: string): string {
  return `template-${jobId}`.slice(0, 64);
}

function createInitialState(): VariantsState {
  const variant = createVariant(
    createDefaultVault(),
    initialStyleState.style,
    DEFAULT_VARIANT_ID,
    "Default"
  );
  const { template, job } = splitVariant(variant, templateIdFor(variant.id));
  return {
    templates: [template],
    jobs: [job],
    activeJobId: job.id,
    locks: NO_LOCKS,
    unlockedIds: [],
  };
}

export const initialState: VariantsState = createInitialState();

/**
 * Makes loaded templates and jobs usable: a job whose template is missing moves to the first
 * template, and no templates / no jobs gives the default ones. The active job stays if it exists.
 */
function normalise(
  templates: Template[],
  jobs: Job[],
  activeJobId: string
): Pick<VariantsState, "templates" | "jobs" | "activeJobId"> {
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

function jobOf(state: VariantsState, jobId: string): Job | undefined {
  return state.jobs.find((j) => j.id === jobId);
}

/** The template a job is drawn with (the first one if the job's is missing) */
function templateOf(state: VariantsState, job: Job): Template {
  return (
    state.templates.find((t) => t.id === job.templateId) ?? state.templates[0]
  );
}

/** Changes the template of job `jobId`; also drops the stored auto-fit result of the jobs on it when asked */
function editTemplate(
  state: VariantsState,
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
  state: VariantsState,
  jobId: string,
  change: (job: Job) => void
): void {
  const job = jobOf(state, jobId);
  if (job) {
    change(job);
  }
}

/** Slice to access templates and jobs. Removing or hiding things here never touches the vault. */
const variantsSlice = createSlice({
  name: "variants",
  initialState,
  reducers: {
    /**
     * Replaces everything with these variants, each split into its own template and job.
     * An empty list becomes the default template and job.
     */
    setVariants(state, action: PayloadAction<Variant[]>) {
      if (action.payload.length === 0) {
        return { ...createInitialState(), locks: state.locks };
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

    createVariant: {
      reducer(state, action: PayloadAction<{ template: Template; job: Job }>) {
        state.templates.push(action.payload.template);
        state.jobs.push(action.payload.job);
        state.activeJobId = action.payload.job.id;
      },
      prepare(input: {
        vault: Vault;
        style: Style;
        name: string;
        id?: string;
      }) {
        const id = input.id ?? nanoid();
        return {
          payload: splitVariant(
            createVariant(input.vault, input.style, id, input.name),
            templateIdFor(id)
          ),
        };
      },
    },

    /** Adds a finished variant (e.g. one made from an AI proposal) as a job with its own new template, and makes it the active one */
    insertVariant(state, action: PayloadAction<Variant>) {
      const { template, job } = splitVariant(
        action.payload,
        templateIdFor(action.payload.id)
      );
      state.templates.push(template);
      state.jobs.push(job);
      state.activeJobId = job.id;
    },

    /** A new job on a template of its own (a copy of the source's), so the source is untouched */
    duplicateVariant: {
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
        const template = duplicateTemplate(
          current(templateOf(state, source)),
          templateIdFor(action.payload.id),
          name
        );
        const copy = {
          ...duplicateJob(source, action.payload.id, name, {
            templateId: template.id,
          }),
          // a copy keeps the record of the proposal it came from, as variants always did
          ...(source.tailor ? { tailor: structuredClone(source.tailor) } : {}),
        };
        state.templates.push(template);
        state.jobs.push(copy);
        state.activeJobId = copy.id;
      },
      prepare(input: { sourceId: string; name?: string; id?: string }) {
        return { payload: { ...input, id: input.id ?? nanoid() } };
      },
    },

    renameVariant(state, action: PayloadAction<{ id: string; name: string }>) {
      editJob(state, action.payload.id, (job) => {
        job.name = action.payload.name;
      });
    },

    /** The last job cannot be deleted, so there is always one to show. Its template goes too when no other job uses it. */
    deleteVariant(state, action: PayloadAction<{ id: string }>) {
      const job = jobOf(state, action.payload.id);
      if (!job || state.jobs.length <= 1) {
        return;
      }
      state.jobs = state.jobs.filter((j) => j.id !== job.id);
      if (!state.jobs.some((j) => j.templateId === job.templateId)) {
        state.templates = state.templates.filter(
          (t) => t.id !== job.templateId
        );
      }
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

    /** The lock state from the applications. An approved unlock is dropped when the job is no longer locked. */
    setLocks(state, action: PayloadAction<VariantLocks>) {
      state.locks = action.payload;
      state.unlockedIds = state.unlockedIds.filter((id) =>
        isLockedIn(state, id)
      );
    },

    /** The user approved editing a locked job (the sent copy is not changed) */
    unlockVariant(state, action: PayloadAction<{ id: string }>) {
      if (!state.unlockedIds.includes(action.payload.id)) {
        state.unlockedIds.push(action.payload.id);
      }
    },

    /** Locks again, e.g. after saving */
    relockVariants(state, action: PayloadAction<{ ids: string[] }>) {
      state.unlockedIds = state.unlockedIds.filter(
        (id) => !action.payload.ids.includes(id)
      );
    },

    setActiveVariant(state, action: PayloadAction<{ id: string }>) {
      if (state.jobs.some((j) => j.id === action.payload.id)) {
        state.activeJobId = action.payload.id;
      }
    },

    /** What one item shows in a job. `variantId` is the job's id. */
    setItemSelection(
      state,
      action: PayloadAction<{
        variantId: string;
        itemId: string;
        change: Partial<ItemSelection>;
      }>
    ) {
      const { variantId, itemId, change } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === variantId);
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
        variantId: string;
        itemId: string;
        bulletId: string;
        change: Partial<BulletSelection>;
      }>
    ) {
      const { variantId, itemId, bulletId, change } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === variantId);
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
        variantId: string;
        orders: Record<string, number>;
      }>
    ) {
      const index = state.jobs.findIndex(
        (j) => j.id === action.payload.variantId
      );
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
        variantId: string;
        itemId: string;
        orders: Record<string, number>;
      }>
    ) {
      const { variantId, itemId, orders } = action.payload;
      const index = state.jobs.findIndex((j) => j.id === variantId);
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
    setVariantAppearance(
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

/** Whether the job is locked by its applications, whatever was approved */
function isLockedIn(state: Pick<VariantsState, "locks">, id: string): boolean {
  return (
    state.locks.hasUnreadable || (state.locks.byVariant[id]?.length ?? 0) > 0
  );
}

/** Whether the job cannot be changed right now: locked, and no unlock approved */
export function isVariantReadOnly(state: VariantsState, id: string): boolean {
  return isLockedIn(state, id) && !state.unlockedIds.includes(id);
}

/** Whether a template cannot be changed right now: a job on it is read-only, so its look is frozen too */
export function isTemplateReadOnly(
  state: VariantsState,
  templateId: string
): boolean {
  return state.jobs.some(
    (job) => job.templateId === templateId && isVariantReadOnly(state, job.id)
  );
}

const LOCK_ACTIONS: string[] = [
  "variants/setVariants",
  "variants/setTemplatesAndJobs",
  "variants/setLocks",
  "variants/unlockVariant",
  "variants/relockVariants",
  "variants/setActiveVariant",
];

function sameEntries<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/**
 * The slice reducer, plus the lock: whatever an action did to a read-only job (edit,
 * rename, delete) or to a template such a job uses is undone here, so no screen, shortcut
 * or write-back can change a CV that was sent. Loading and the lock actions pass through.
 */
export function variantsReducer(
  state: VariantsState | undefined,
  action: { type: string }
): VariantsState {
  const next = variantsSlice.reducer(state, action);
  if (!state || next === state || LOCK_ACTIONS.includes(action.type)) {
    return next;
  }
  const readOnlyJobs = state.jobs.filter((j) => isVariantReadOnly(state, j.id));
  if (readOnlyJobs.length === 0) {
    return next;
  }
  let jobs = next.jobs;
  for (const before of readOnlyJobs) {
    const index = jobs.findIndex((j) => j.id === before.id);
    if (index === -1) {
      const at = state.jobs.indexOf(before);
      jobs = [...jobs.slice(0, at), before, ...jobs.slice(at)];
    } else if (jobs[index] !== before) {
      jobs = jobs.map((j, i) => (i === index ? before : j));
    }
  }
  let templates = next.templates;
  const frozenIds = new Set(readOnlyJobs.map((j) => j.templateId));
  for (const id of frozenIds) {
    const before = state.templates.find((t) => t.id === id);
    if (!before) {
      continue;
    }
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) {
      const at = state.templates.indexOf(before);
      templates = [...templates.slice(0, at), before, ...templates.slice(at)];
    } else if (templates[index] !== before) {
      templates = templates.map((t, i) => (i === index ? before : t));
    }
  }
  // everything undone: keep the very same arrays, so no change (or undo step) is seen
  jobs = sameEntries(jobs, state.jobs) ? state.jobs : jobs;
  templates = sameEntries(templates, state.templates)
    ? state.templates
    : templates;
  const activeJobId = jobs.some((j) => j.id === next.activeJobId)
    ? next.activeJobId
    : state.activeJobId;
  return jobs === next.jobs &&
    templates === next.templates &&
    activeJobId === next.activeJobId
    ? next
    : { ...next, jobs, templates, activeJobId };
}

export const {
  setVariants,
  setTemplatesAndJobs,
  setLocks,
  unlockVariant,
  relockVariants,
  createVariant: addVariant,
  insertVariant,
  duplicateVariant,
  renameVariant,
  deleteVariant,
  setJobTemplate,
  setActiveVariant,
  setItemSelection,
  setBulletSelection,
  setBulletOrders,
  setItemOrders,
  setVariantAppearance,
  setTone,
  setPageLimit,
  setSkillStyle,
  setAutoFit,
  setFitLimits,
  setTuning,
} = variantsSlice.actions;

/** The active job is locked (sent) and no unlock was approved */
export function isActiveVariantReadOnlySelector(state: {
  variants: VariantsState;
}): boolean {
  return isVariantReadOnly(state.variants, state.variants.activeJobId);
}

/** The active job or its template is frozen by a sent job: look and content cannot be edited */
export function isActiveAppearanceReadOnlySelector(state: {
  variants: VariantsState;
}): boolean {
  const job = activeJobSelector(state);
  return (
    isVariantReadOnly(state.variants, job.id) ||
    isTemplateReadOnly(state.variants, job.templateId)
  );
}

/** `resolveVariant` that returns the same object for the same template and job objects */
const resolvedCache = new WeakMap<Template, WeakMap<Job, Variant>>();

export function resolveCached(template: Template, job: Job): Variant {
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

type SliceRoot = { variants: VariantsState };

export function activeJobSelector(state: SliceRoot): Job {
  const { jobs, activeJobId } = state.variants;
  return jobs.find((j) => j.id === activeJobId) ?? jobs[0];
}

/** The template of the active job */
export function activeTemplateSelector(state: SliceRoot): Template {
  const { templates } = state.variants;
  const job = activeJobSelector(state);
  return templates.find((t) => t.id === job.templateId) ?? templates[0];
}

export function templatesSelector(state: SliceRoot): Template[] {
  return state.variants.templates;
}

export function jobsSelector(state: SliceRoot): Job[] {
  return state.variants.jobs;
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

/** Alias with the name the issue uses */
export const selectActiveVariant = activeVariantSelector;
