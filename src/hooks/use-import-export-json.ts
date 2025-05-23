import { useCallback } from "react";
import { CVFile, CVFileSchema } from "../custom-types/json-types";
import { useAppDispatch, useAppSelector } from "../store/store-helper";
import { cvDataSelector, setCvData } from "../store/cv-data/cv-data-slice";

interface ReturnProps {
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useImportExportJson(): ReturnProps {
  const dispatch = useAppDispatch();
  const cvData = useAppSelector(cvDataSelector);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          const parsed = CVFileSchema.check(raw);
          dispatch(setCvData(parsed.data));
          alert("CV imported successfully!");
        } catch (err) {
          console.error(err);
          alert("Invalid file format.");
        }
      };
      reader.readAsText(file);
    },
    [dispatch]
  );

  const handleExport = useCallback(() => {
    if (!cvData) {
      alert("No CV data to export.");
      return;
    }
    const fileData: CVFile = {
      version: "1.0",
      data: cvData,
      style: {
        template: "one-column",
        shouldShowFullContactLinks: true,
        ratingIcon: "star",
      },
    };
    const blob = new Blob([JSON.stringify(fileData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "cv-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [cvData]);

  return {
    handleExport,
    handleImport,
  };
}
