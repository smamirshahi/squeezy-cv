import { useEffect, useMemo } from "react";
import { useStore } from "react-redux";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { CvFile } from "@custom-types/vault-types";
import { createApiClient } from "@store/persistence/api-client";
import {
  loadFromServer,
  saveToServer,
} from "@store/persistence/persistence-actions";
import { isDirty, toSavedState } from "@store/persistence/persistence-logic";
import { AppDispatch, RootState, useAppSelector } from "@store/store-helper";

/** In development only: the fake sample CV, shown when nothing is saved yet */
async function loadSample(): Promise<CvFile | null> {
  if (!import.meta.env.DEV) {
    return null;
  }
  const module = await import("@fixtures/sample-cv.json");
  return migrateCvFile(module.default);
}

/** True if the editor holds changes that are not saved on the server */
export function useHasUnsavedChanges(): boolean {
  const vault = useAppSelector((s) => s.vault);
  const metaData = useAppSelector((s) => s.cvData.metaData);
  const style = useAppSelector((s) => s.cvData.style);
  const variants = useAppSelector((s) => s.variants.variants);
  const saved = useAppSelector((s) => s.persistence.saved);
  return useMemo(
    () => isDirty(saved, toSavedState(vault, metaData, style, variants)),
    [vault, metaData, style, variants, saved]
  );
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
      void loadFromServer(
        api,
        store.dispatch as AppDispatch,
        store.getState,
        loadSample
      ),
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
    if (!hasUnsavedChanges || status === "loading") {
      return undefined;
    }
    function warn(event: BeforeUnloadEvent): void {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges, status]);
}
