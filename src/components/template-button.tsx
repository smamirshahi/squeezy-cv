import { Button, ButtonGroup } from "@mui/material";
import { useDispatch } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { useImportExportJson } from "../hooks/use-import-export-json";
import { styled } from "@mui/material/styles";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import { setTemplate } from "../store/applicant/applicant-slice";

interface Props {
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

export function TemplateButton({ printReference }: Props): JSX.Element {
  const onPrintClicked = useReactToPrint({ contentRef: printReference });
  const dispatch = useDispatch();
  const { handleExport, handleImport } = useImportExportJson();

  return (
    <ButtonGroup
      variant="outlined"
      aria-label="Basic button group"
      sx={{ mb: "30px" }}
    >
      <Button onClick={() => dispatch(setTemplate("one-column"))}>
        One Column
      </Button>
      <Button onClick={() => dispatch(setTemplate("two-column"))}>
        Two Column
      </Button>
      <Button onClick={() => onPrintClicked()} startIcon={<PrintIcon />}>
        Print
      </Button>
      <Button onClick={handleExport} startIcon={<DownloadIcon />}>
        Export
      </Button>
      {/* <pre>{JSON.stringify(cvData, null, 2)}</pre> */}
      <Button
        component="label"
        role={undefined}
        tabIndex={-1}
        startIcon={<UploadIcon />}
      >
        Import
        <VisuallyHiddenInput
          type="file"
          onChange={handleImport}
          accept=".json"
        />
      </Button>
    </ButtonGroup>
  );
}
