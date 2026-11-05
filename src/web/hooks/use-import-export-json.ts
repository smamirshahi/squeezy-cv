import { useCallback, useEffect } from "react";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  createCvFile,
  parseCvFileText,
  serializeCvFile,
} from "@shared/vault/cv-file";
import { CvFile } from "@custom-types/vault-types";
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import {
  metaDataSelector,
  setMetaData,
  setStyle,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { setVault, vaultSelector } from "@store/vault/vault-slice";

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

/** Puts a loaded CV file into the store */
function loadCvFile(dispatch: AppDispatch, file: CvFile): void {
  dispatch(setVault(file.vault));
  dispatch(setStyle(file.style));
  dispatch(setMetaData(file.metaData));
}

/** Custom hook to handle importing and exporting CV data in JSON format */
export function useImportExportJson(): ReturnProps {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const metaData = useAppSelector(metaDataSelector);
  const style = useAppSelector(styleSelector);

  // In development only: start with the fake sample CV instead of an empty form
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    import("@fixtures/sample-cv.json")
      .then((module) => {
        loadCvFile(dispatch, migrateCvFile(module.default));
      })
      .catch((_error) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load the sample CV.");
      });
  }, [dispatch]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return "";
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          loadCvFile(dispatch, parseCvFileText(event.target?.result as string));
        } catch (_error: unknown) {
          // eslint-disable-next-line no-alert
          alert("Invalid file format.");
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
