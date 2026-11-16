import { useCallback } from "react";
import {
  createCvFile,
  parseCvFileTextWithNotice,
  serializeCvFile,
} from "@shared/vault/cv-file";
import { notify } from "@components/notifications/notify";
import { describeUpgrade } from "@shared/migration/migration-chains";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { metaDataSelector, styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";

interface ReturnProps {
  /**
   * Handles the export of CV data to a JSON file.
   * It creates a Blob from the CV data and triggers a download.
   */
  handleExport: (fileName: string) => void;

  /**
   * Handles the import of CV data from a JSON file.
   * It reads the file, parses it, and updates the CV data in the store.
   */
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => string;
}

/** Custom hook to handle importing and exporting CV data in JSON format */
export function useImportExportJson(): ReturnProps {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const metaData = useAppSelector(metaDataSelector);
  const style = useAppSelector(styleSelector);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return "";
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const { file: cvFile, notice } = parseCvFileTextWithNotice(
            event.target?.result as string
          );
          loadCvFileIntoStore(dispatch, cvFile);
          if (notice) {
            notify({ kind: "info", text: describeUpgrade(notice) });
          }
        } catch (error: unknown) {
          // A file from a newer app says so; anything else is just not a CV file
          notify({
            kind: "error",
            text:
              error instanceof Error && error.message.includes("Squeezy CV")
                ? error.message
                : "Invalid file format.",
          });
        }
      };
      reader.readAsText(file);
      return file.name.replace(/\.[^/.]+$/, "");
    },
    [dispatch]
  );

  const handleExport = useCallback(
    (fileName: string) => {
      const blob = new Blob(
        [serializeCvFile(createCvFile(vault, metaData, style))],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ? `${fileName}.json` : "cv-export.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    [vault, metaData, style]
  );

  return {
    handleImport,
    handleExport,
  };
}
