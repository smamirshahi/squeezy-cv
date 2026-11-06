import { Store } from "@reduxjs/toolkit";
import { Variant } from "@custom-types/variant-types";
import { ApiClient } from "@store/persistence/api-client";
import { saveToServer } from "@store/persistence/persistence-actions";
import { isDirty, toSavedState } from "@store/persistence/persistence-logic";
import { AppDispatch, RootState } from "@store/store-helper";

/**
 * Makes sure what the server has is what the screen shows, then returns the active
 * variant. The server makes PDFs and applications from the *saved* variant, so unsaved
 * changes are saved first. Throws with a readable message if that is not possible.
 */
export async function saveActiveVariant(
  store: Store<RootState>,
  api: ApiClient
): Promise<Variant> {
  const dispatch = store.dispatch as AppDispatch;
  const initial = store.getState();
  if (initial.persistence.status !== "ready") {
    throw new Error("This needs the local server. Start it and try again.");
  }
  const current = toSavedState(
    initial.vault,
    initial.cvData.metaData,
    initial.cvData.style,
    initial.variants.variants
  );
  if (isDirty(initial.persistence.saved, current)) {
    await saveToServer(api, dispatch, store.getState);
    const { saveError } = store.getState().persistence;
    if (saveError) {
      throw new Error(`Saving failed: ${saveError}`);
    }
  }
  const { variants } = store.getState().variants;
  const { activeId } = store.getState().variants;
  return variants.find((v) => v.id === activeId) ?? variants[0];
}
