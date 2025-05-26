import { Button, ButtonGroup } from "@mui/material";
import { useDispatch } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { useImportExportJson } from "../hooks/use-import-export-json";
import { styled } from "@mui/material/styles";
import UploadIcon from "@mui/icons-material/Upload";
import PrintIcon from "@mui/icons-material/Print";
import { setTemplate } from "../store/cv-data/cv-data-slice";
import { SetStateFunction } from "@src/store/store-helper";

interface Props {
  /**
   * Reference to the div that contains the content to be printed.
   * This is used by react-to-print to know what to print.
   */
  printReference: React.RefObject<HTMLDivElement | null>;

  setFileName: SetStateFunction<string>;
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
export function TemplateButton({
  printReference,
  setFileName,
}: Props): JSX.Element {
  const onPrintClicked = useReactToPrint({ contentRef: printReference });
  const dispatch = useDispatch();
  const { handleImport } = useImportExportJson();

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
          onChange={(event) => {
            const fileName = handleImport(event);
            setFileName(fileName);
          }}
          accept=".json"
        />
      </Button>
    </ButtonGroup>
  );
}
