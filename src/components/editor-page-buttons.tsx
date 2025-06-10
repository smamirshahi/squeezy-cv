import { Button, Grid, TextField } from "@mui/material";
import { useReactToPrint } from "react-to-print";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { styled } from "@mui/material/styles";
import UploadIcon from "@mui/icons-material/Upload";
import PrintIcon from "@mui/icons-material/Print";
import { useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";

interface Props {
  /**
   * Reference to the div that contains the content to be printed.
   * This is used by react-to-print to know what to print.
   */
  printReference: React.RefObject<HTMLDivElement | null>;
}

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

/** A button group that allows the user to change the template, print, export, and import the CV data */
export function EditorPageButtons({ printReference }: Props): JSX.Element {
  const [fileName, setFileName] = useState<string>("");
  const onPrintClicked = useReactToPrint({ contentRef: printReference });
  const { handleImport, handleExport } = useImportExportJson();

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      sx={{ mb: "20px" }}
      gap={1}
    >
      <Button
        component="label"
        variant="contained"
        role={undefined}
        tabIndex={-1}
        startIcon={<UploadIcon />}
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
          "& .MuiInputBase-root": { height: "40px", fontSize: "1rem" },
        }}
        inputProps={{ style: { height: "40px" } }}
      />
      <Button
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
        variant="contained"
        onClick={() => handleExport(fileName)}
        startIcon={<DownloadIcon />}
      >
        Save
      </Button>
      <Button
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
        variant="contained"
        onClick={() => onPrintClicked()}
        startIcon={<PrintIcon />}
      >
        Print
      </Button>
    </Grid>
  );
}
