import { Button, Grid, TextField } from "@mui/material";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { styled } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { MarkAsApplied } from "@pages/applications-page/mark-as-applied";
import { useDownloadPdf } from "@hooks/use-download-pdf";
import { useState } from "react";
import SaveIcon from "@mui/icons-material/Save";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

/** A button group that allows the user to export, and import the CV data */
export function EditorPageButtons(): JSX.Element {
  const [fileName, setFileName] = useState<string>("");
  const { handleImport, handleExport } = useImportExportJson();

  const { download, isBusy } = useDownloadPdf();

  return (
    <Grid container direction="row" justifyContent="center" gap={1}>
      <Button
        component="label"
        color="inherit"
        role={undefined}
        tabIndex={-1}
        startIcon={<DownloadIcon />}
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
      >
        Import
        <VisuallyHiddenInput
          type="file"
          onChange={(event) => {
            const fileName = handleImport(event);
            setFileName(fileName);
          }}
          accept=".json"
        />
      </Button>
      <TextField
        value={fileName}
        onChange={(event) => setFileName(event.target.value)}
        sx={{
          height: "40px",
          width: "180px",
          backgroundColor: "white",
          "& .MuiInputBase-root": { height: "40px", fontSize: "1rem" },
        }}
        inputProps={{ style: { height: "40px" } }}
      />
      <Button
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
        color="inherit"
        onClick={() => handleExport(fileName)}
        startIcon={<SaveIcon />}
      >
        Export JSON
      </Button>
      <Button
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
        color="inherit"
        disabled={isBusy}
        onClick={() => void download(fileName)}
        startIcon={<PictureAsPdfIcon />}
      >
        PDF
      </Button>
      <MarkAsApplied />
    </Grid>
  );
}
