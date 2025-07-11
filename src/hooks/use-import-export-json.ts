import { useCallback, useEffect } from "react";
import { CVJson, CVJsonSchema } from "@custom-types/json-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  setCvData,
  setStyle,
  styleSelector,
} from "@store/cv-data/cv-data-slice";

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
  const cvData = useAppSelector(cvDataSelector);
  const style = useAppSelector(styleSelector);

  // Automatic import on mount
  useEffect(() => {
    fetch("../../cv-data-example/cv-export.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("File not found");
        }
        return response.json();
      })
      .then((raw) => {
        const parsed = CVJsonSchema.check(raw);
        dispatch(setCvData(parsed.data));
        dispatch(setStyle(parsed.style));
      })
      .catch((_error) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load default CV file.");
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
          const raw = JSON.parse(event.target?.result as string);
          const parsed = CVJsonSchema.check(raw);
          dispatch(setCvData(parsed.data));
          dispatch(setStyle(parsed.style));
          // alert("CV imported successfully!");
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
      if (!cvData) {
        // eslint-disable-next-line no-alert
        alert("No CV data to export.");
        return;
      }
      const fileData: CVJson = {
        metaData: {
          version: "1.0",
          title: "",
          jobUrl: "",
        },
        data: cvData,
        style,
      };
      const blob = new Blob([JSON.stringify(fileData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ? `${fileName}.json` : "cv-export.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    [cvData, style]
  );

  return {
    handleImport,
    handleExport,
  };
}
