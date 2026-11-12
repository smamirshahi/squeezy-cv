import { useEffect, useMemo } from "react";
import { useStore } from "react-redux";
import { createApiClient } from "@store/persistence/api-client";
import {
  loadFromServer,
  saveToServer,
} from "@store/persistence/persistence-actions";
import { isDirty, toSavedState } from "@store/persistence/persistence-logic";
import { savableOf } from "@store/jobs/jobs-slice";
import { AppDispatch, RootState, useAppSelector } from "@store/store-helper";

/** True if the editor holds changes that are not saved on the server */
export function useHasUnsavedChanges(): boolean {
  const vault = useAppSelector((s) => s.vault);
  const metaData = useAppSelector((s) => s.cvData.metaData);
  const style = useAppSelector((s) => s.cvData.style);
  const jobsState = useAppSelector((s) => s.jobs);
  const saved = useAppSelector((s) => s.persistence.saved);
  return useMemo(() => {
    const { templates, jobs } = savableOf(jobsState);
    return isDirty(
      saved,
      toSavedState(vault, metaData, style, templates, jobs)
    );
  }, [vault, metaData, style, jobsState, saved]);
}

interface SaveActions {
  /** Writes what changed since the last save */
  save: () => void;

  /** Asks the server again what is saved, e.g. after it was started */
  retry: () => void;
}

/** The actions behind the Save and Retry buttons */
export function useSaveActions(): SaveActions {
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  return {
    save: () =>
      void saveToServer(api, store.dispatch as AppDispatch, store.getState),
    retry: () =>
      void loadFromServer(api, store.dispatch as AppDispatch, store.getState),
  };
}

/**
 * Loads the saved CV from the local server once and warns before the page is closed with
 * unsaved changes. Mount it once, in `App`.
 */
export function usePersistence(): void {
  const { retry: load } = useSaveActions();
  const hasUnsavedChanges = useHasUnsavedChanges();
  const status = useAppSelector((s) => s.persistence.status);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on start
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges || status === "loading" || status === "demo") {
      return undefined;
    }
    function warn(event: BeforeUnloadEvent): void {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges, status]);
}
