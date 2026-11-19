import { nanoid } from "@reduxjs/toolkit";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";
import { Variant } from "@custom-types/variant-types";
import { CvFile } from "@custom-types/vault-types";
import { activateVariant } from "@hooks/use-sync-active-job";
import { resolveVariant, splitVariant } from "@shared/variant/template-job";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { createCvFile } from "@shared/vault/cv-file";
import { initialState as initialAppState } from "@store/app/app-slice";
import { setMetaData } from "@store/cv-data/cv-data-slice";
import { ApiClient, ApiError } from "@store/persistence/api-client";
import {
  SavedState,
  planSave,
  toSavedState,
} from "@store/persistence/persistence-logic";
import {
  setSaveError,
  setSavedState,
  setSaving,
  setStorageStatus,
  setUnreadable,
} from "@store/persistence/persistence-slice";
import { AppDispatch, RootState } from "@store/store-helper";
import { clearHistory } from "@store/history/history";
import {
  markJobPlaceholder,
  markPlaceholder,
  savableOf,
  setTemplatesAndJobs,
  setVariants,
} from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";

/** The templates and jobs of a CV, or variants that are split into one template and one job each */
export type LoadedVariants = Variant[] | { templates: Template[]; jobs: Job[] };

/** Puts a CV file and its templates and jobs into the store and shows the first job */
export function loadCvFileIntoStore(
  dispatch: AppDispatch,
  file: CvFile,
  loaded?: LoadedVariants
): void {
  dispatch(setVault(file.vault));
  dispatch(setMetaData(file.metaData));
  let first: Variant;
  if (Array.isArray(loaded) && loaded.length > 0) {
    dispatch(setVariants(loaded));
    first = loaded[0];
  } else if (!Array.isArray(loaded) && loaded && loaded.jobs.length > 0) {
    dispatch(setTemplatesAndJobs(loaded));
    const job = loaded.jobs[0];
    first = resolveVariant(
      loaded.templates.find((t) => t.id === job.templateId) ??
        loaded.templates[0],
      job
    );
  } else if (!Array.isArray(loaded) && loaded && loaded.templates.length > 0) {
    // saved templates but no job yet: keep the templates, the job is a stand-in
    const standIn = createDefaultVariant(
      file,
      nanoid(),
      initialAppState.structure
    );
    const { job } = splitVariant(standIn, loaded.templates[0].id);
    dispatch(setTemplatesAndJobs({ templates: loaded.templates, jobs: [job] }));
    dispatch(markJobPlaceholder());
    first = resolveVariant(loaded.templates[0], job);
  } else {
    first = createDefaultVariant(file, nanoid(), initialAppState.structure);
    dispatch(setVariants([first]));
    dispatch(markPlaceholder());
  }
  activateVariant(dispatch, first);
  // a loaded file starts a new history: undo never goes back to the file before it
  dispatch(clearHistory());
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

const loadsInFlight = new WeakMap<AppDispatch, Promise<void>>();

/**
 * Reads what is saved on the server into the store. If nothing is saved yet, the
 * optional `loadFallback` (the sample CV in development) is shown, unsaved. When the
 * saved data cannot be read, saving is blocked (status "error") so it is never
 * overwritten by the empty default.
 *
 * A load that is already running is not started again (React's development mode starts
 * the first load twice): a second one would finish after the address had picked its job
 * and put the first job back.
 */
export function loadFromServer(
  api: ApiClient,
  dispatch: AppDispatch,
  getState: () => RootState,
  loadFallback?: () => Promise<CvFile | null>
): Promise<void> {
  const running = loadsInFlight.get(dispatch);
  if (running) {
    return running;
  }
  const load = readFromServer(api, dispatch, getState, loadFallback).finally(
    () => loadsInFlight.delete(dispatch)
  );
  loadsInFlight.set(dispatch, load);
  return load;
}

async function readFromServer(
  api: ApiClient,
  dispatch: AppDispatch,
  getState: () => RootState,
  loadFallback?: () => Promise<CvFile | null>
): Promise<void> {
  async function showFallback(): Promise<void> {
    const file = await loadFallback?.();
    if (file) {
      loadCvFileIntoStore(dispatch, file);
    }
  }

  dispatch(setStorageStatus({ status: "loading" }));
  try {
    const file = await api.loadVault();
    const [templateSummaries, jobSummaries] = await Promise.all([
      api.listTemplates(),
      api.listJobs(),
    ]);
    const broken = [
      ...templateSummaries.filter((summary) => summary.isCorrupt),
      ...jobSummaries.filter((summary) => summary.isCorrupt),
    ];
    dispatch(
      setUnreadable({
        templates: templateSummaries
          .filter((s) => s.isCorrupt)
          .map((s) => s.id),
        jobs: jobSummaries.filter((s) => s.isCorrupt).map((s) => s.id),
      })
    );
    if (broken.length > 0) {
      dispatch(
        setStorageStatus({
          status: "error",
          message: `These saved templates or jobs cannot be read: ${broken
            .map((b) => b.id)
            .join(", ")}. Saving is off so nothing is overwritten.`,
        })
      );
      return;
    }
    const [templates, jobs] = await Promise.all([
      Promise.all(
        templateSummaries.map((summary) => api.loadTemplate(summary.id))
      ),
      Promise.all(jobSummaries.map((summary) => api.loadJob(summary.id))),
    ]);
    loadCvFileIntoStore(dispatch, file, { templates, jobs });

    const state = getState();
    const current = toSavedState(
      state.vault,
      state.cvData.metaData,
      state.cvData.style,
      savableOf(state.jobs).templates,
      savableOf(state.jobs).jobs
    );
    // Templates and jobs that were not on disk (defaults made for an old file) stay unsaved
    const onDisk = {
      templates: new Set(templates.map((t) => t.id)),
      jobs: new Set(jobs.map((j) => j.id)),
    };
    dispatch(
      setSavedState({
        vault: current.vault,
        templates: Object.fromEntries(
          Object.entries(current.templates).filter(([id]) =>
            onDisk.templates.has(id)
          )
        ),
        jobs: Object.fromEntries(
          Object.entries(current.jobs).filter(([id]) => onDisk.jobs.has(id))
        ),
      })
    );
    dispatch(setStorageStatus({ status: "ready" }));
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") {
      await showFallback();
      dispatch(setSavedState(null));
      dispatch(setStorageStatus({ status: "ready" }));
    } else if (error instanceof ApiError && error.code === "unreachable") {
      await showFallback();
      dispatch(
        setStorageStatus({
          status: "offline",
          message:
            "The local server is not running, so nothing can be saved. Start it with pnpm dev.",
        })
      );
    } else {
      dispatch(
        setStorageStatus({
          status: "error",
          message: `${errorText(error)} Saving is off so nothing is overwritten.`,
        })
      );
    }
  }
}

/**
 * Removes the saved templates and jobs that cannot be read (the storage keeps a copy of
 * each, `.deleted`), then reads everything again so saving is allowed.
 */
export async function removeUnreadable(
  api: ApiClient,
  dispatch: AppDispatch,
  getState: () => RootState
): Promise<void> {
  const { templates, jobs } = getState().persistence.unreadable;
  try {
    for (const id of jobs) {
      await ignoreNotFound(() => api.deleteJob(id));
    }
    for (const id of templates) {
      await ignoreNotFound(() => api.deleteTemplate(id));
    }
  } catch (error) {
    dispatch(
      setStorageStatus({
        status: "error",
        message: `${errorText(error)} Saving is off so nothing is overwritten.`,
      })
    );
    return;
  }
  await loadFromServer(api, dispatch, getState);
}

async function ignoreNotFound(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof ApiError && error.code === "not_found")) {
      throw error;
    }
  }
}

/** Writes what changed since the last save. Does nothing unless the status is "ready". */
export async function saveToServer(
  api: ApiClient,
  dispatch: AppDispatch,
  getState: () => RootState
): Promise<void> {
  const state = getState();
  if (state.persistence.status !== "ready" || state.persistence.isSaving) {
    return;
  }
  const current: SavedState = toSavedState(
    state.vault,
    state.cvData.metaData,
    state.cvData.style,
    savableOf(state.jobs).templates,
    savableOf(state.jobs).jobs
  );
  const plan = planSave(state.persistence.saved, current);

  dispatch(setSaving(true));
  try {
    if (plan.shouldSaveVault) {
      await api.saveVault(
        createCvFile(state.vault, state.cvData.metaData, state.cvData.style)
      );
    }
    // templates first (a job needs its template), deletions last in the opposite order
    for (const id of plan.templatesToSave) {
      const template = state.jobs.templates.find((t) => t.id === id);
      if (template) {
        await api.saveTemplate(template);
      }
    }
    for (const id of plan.jobsToSave) {
      const job = state.jobs.jobs.find((j) => j.id === id);
      if (job) {
        await api.saveJob(job);
      }
    }
    for (const id of plan.jobsToDelete) {
      await ignoreNotFound(() => api.deleteJob(id));
    }
    for (const id of plan.templatesToDelete) {
      await ignoreNotFound(() => api.deleteTemplate(id));
    }
    dispatch(setSavedState(current));
  } catch (error) {
    dispatch(setSaveError(errorText(error)));
  } finally {
    dispatch(setSaving(false));
  }
}
