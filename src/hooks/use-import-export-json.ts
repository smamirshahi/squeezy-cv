import { useCallback, useState } from "react";
import { CVFile, CVFileSchema } from "../types/json-types";

interface ReturnProps {
  cvData?: CVFile["data"];
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useImportExportJson(): ReturnProps {
  const [cvData, setCVData] = useState<CVFile["data"]>();

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const parsed = CVFileSchema.check(raw);
        setCVData(parsed.data);
        alert("CV imported successfully!");
      } catch (err) {
        console.error(err);
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleExport = useCallback(() => {
    if (!cvData) {
      alert("No CV data to export.");
      return;
    }
    const fileData: CVFile = {
      version: "1.0",
      data: cvData,
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

  console.log(cvData);

  return {
    cvData,
    handleExport,
    handleImport,
  };
}
