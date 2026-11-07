import { MetaData } from "@custom-types/json-types";
import { Job } from "@custom-types/job-types";
import { Style } from "@custom-types/styles-types";
import { Template } from "@custom-types/template-types";
import { Vault } from "@custom-types/vault-types";
import { createCvFile } from "@shared/vault/cv-file";

/** What is on disk (or about to be), as text, so it can be compared cheaply */
export interface SavedState {
  vault: string;

  /** Template id -> the text of its file */
  templates: Record<string, string>;

  /** Job id -> the text of its file */
  jobs: Record<string, string>;
}

function textsById(list: { id: string }[]): Record<string, string> {
  return Object.fromEntries(
    list.map((entry) => [entry.id, JSON.stringify(entry)])
  );
}

/** The text of the files for the current data */
export function toSavedState(
  vault: Vault,
  metaData: MetaData,
  style: Style,
  templates: Template[],
  jobs: Job[]
): SavedState {
  return {
    vault: JSON.stringify(createCvFile(vault, metaData, style)),
    templates: textsById(templates),
    jobs: textsById(jobs),
  };
}

export interface SavePlan {
  shouldSaveVault: boolean;
  templatesToSave: string[];
  templatesToDelete: string[];
  jobsToSave: string[];
  jobsToDelete: string[];
}

function changedIds(
  saved: Record<string, string>,
  current: Record<string, string>
): { toSave: string[]; toDelete: string[] } {
  return {
    toSave: Object.keys(current).filter((id) => saved[id] !== current[id]),
    toDelete: Object.keys(saved).filter((id) => !(id in current)),
  };
}

/** What has to be written so that disk matches `current`. `saved` null means nothing is on disk yet. */
export function planSave(
  saved: SavedState | null,
  current: SavedState
): SavePlan {
  const templates = changedIds(saved?.templates ?? {}, current.templates);
  const jobs = changedIds(saved?.jobs ?? {}, current.jobs);
  return {
    shouldSaveVault: saved?.vault !== current.vault,
    templatesToSave: templates.toSave,
    templatesToDelete: templates.toDelete,
    jobsToSave: jobs.toSave,
    jobsToDelete: jobs.toDelete,
  };
}

/** True if anything differs from what is on disk */
export function isDirty(
  saved: SavedState | null,
  current: SavedState
): boolean {
  const plan = planSave(saved, current);
  return (
    plan.shouldSaveVault ||
    plan.templatesToSave.length > 0 ||
    plan.templatesToDelete.length > 0 ||
    plan.jobsToSave.length > 0 ||
    plan.jobsToDelete.length > 0
  );
}
