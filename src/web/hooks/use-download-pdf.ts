import { useMemo, useState } from "react";
import { useStore } from "react-redux";
import { createApiClient } from "@store/persistence/api-client";
import { saveToServer } from "@store/persistence/persistence-actions";
import { isDirty, toSavedState } from "@store/persistence/persistence-logic";
import { AppDispatch, RootState } from "@store/store-helper";

interface Result {
  /** Saves what is unsaved, asks the server for the PDF of the active variant and downloads it */
  download: (fileName: string) => Promise<void>;
  isBusy: boolean;
}

/** The "Download PDF" action. The server prints the saved variant, so unsaved changes are saved first. */
export function useDownloadPdf(): Result {
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  async function download(fileName: string): Promise<void> {
    const dispatch = store.dispatch as AppDispatch;
    const initial = store.getState();
    if (initial.persistence.status !== "ready") {
      // eslint-disable-next-line no-alert
      alert("The PDF is made by the local server. Start it and try again.");
      return;
    }
    setIsBusy(true);
    try {
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
      const { variants } = store.getState();
      const variant =
        variants.variants.find((v) => v.id === variants.activeId) ??
        variants.variants[0];
      const blob = await api.createPdf(variant.id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName || variant.name || "cv"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error instanceof Error ? error.message : "The PDF failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return { download, isBusy };
}
