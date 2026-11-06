import { useMemo, useState } from "react";
import { useStore } from "react-redux";
import { saveActiveVariant } from "@hooks/save-active-variant";
import { createApiClient } from "@store/persistence/api-client";
import { RootState } from "@store/store-helper";

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
    setIsBusy(true);
    try {
      const variant = await saveActiveVariant(store, api);
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
