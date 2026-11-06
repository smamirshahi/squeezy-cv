import { nanoid } from "@reduxjs/toolkit";
import { Variant } from "@custom-types/variant-types";
import { CvFile } from "@custom-types/vault-types";
import { activateVariant } from "@hooks/use-sync-active-variant";
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
} from "@store/persistence/persistence-slice";
import { AppDispatch, RootState } from "@store/store-helper";
import { setVariants } from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";

/** Puts a CV file and its variants into the store and shows the first variant */
export function loadCvFileIntoStore(
  dispatch: AppDispatch,
  file: CvFile,
  variants?: Variant[]
): void {
  const list = variants?.length
    ? variants
    : [createDefaultVariant(file, nanoid(), initialAppState.structure)];
  dispatch(setVault(file.vault));
  dispatch(setMetaData(file.metaData));
  dispatch(setVariants(list));
  activateVariant(dispatch, list[0]);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Reads what is saved on the server into the store. If nothing is saved yet, the
 * optional `loadFallback` (the sample CV in development) is shown, unsaved. When the
 * saved data cannot be read, saving is blocked (status "error") so it is never
 * overwritten by the empty default.
 */
export async function loadFromServer(
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
    const summaries = await api.listVariants();
    const broken = summaries.filter((summary) => summary.isCorrupt);
    if (broken.length > 0) {
      dispatch(
        setStorageStatus({
          status: "error",
          message: `These saved variants cannot be read: ${broken
            .map((b) => b.id)
            .join(", ")}. Saving is off so nothing is overwritten.`,
        })
      );
      return;
    }
    const variants = await Promise.all(
      summaries.map((summary) => api.loadVariant(summary.id))
    );
    loadCvFileIntoStore(dispatch, file, variants);

    const state = getState();
    const current = toSavedState(
      state.vault,
      state.cvData.metaData,
      state.cvData.style,
      state.variants.variants
    );
    // Variants that were not on disk (a default made for an old file) stay unsaved
    const onDisk = new Set(variants.map((v) => v.id));
    dispatch(
      setSavedState({
        vault: current.vault,
        variants: Object.fromEntries(
          Object.entries(current.variants).filter(([id]) => onDisk.has(id))
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
    state.variants.variants
  );
  const plan = planSave(state.persistence.saved, current);

  dispatch(setSaving(true));
  try {
    if (plan.shouldSaveVault) {
      await api.saveVault(
        createCvFile(state.vault, state.cvData.metaData, state.cvData.style)
      );
    }
    for (const id of plan.variantsToSave) {
      const variant = state.variants.variants.find((v) => v.id === id);
      if (variant) {
        await api.saveVariant(variant);
      }
    }
    for (const id of plan.variantsToDelete) {
      try {
        await api.deleteVariant(id);
      } catch (error) {
        if (!(error instanceof ApiError && error.code === "not_found")) {
          throw error;
        }
      }
    }
    dispatch(setSavedState(current));
  } catch (error) {
    dispatch(setSaveError(errorText(error)));
  } finally {
    dispatch(setSaving(false));
  }
}
