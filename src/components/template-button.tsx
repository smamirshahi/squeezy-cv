import { Button, ButtonGroup } from "@mui/material";
import { setTemplate } from "../store/ui/ui-slice";
import { useDispatch } from "react-redux";
import { useReactToPrint } from "react-to-print";

interface Props {
  printReference: React.RefObject<HTMLDivElement | null>;
}

export function TemplateButton({ printReference }: Props): JSX.Element {
  const onPrintClicked = useReactToPrint({ contentRef: printReference });
  const dispatch = useDispatch();

  return (
    <ButtonGroup
      variant="contained"
      aria-label="Basic button group"
      sx={{ mb: "30px" }}
    >
      <Button onClick={() => dispatch(setTemplate("one-column"))}>
        One Column
      </Button>
      <Button onClick={() => dispatch(setTemplate("two-column"))}>
        Two Column
      </Button>
      <Button onClick={() => onPrintClicked()}>Print</Button>
      <Button onClick={() => onPrintClicked()}>Upload JSON</Button>
      <Button onClick={() => onPrintClicked()}>Save JSON</Button>
      template
    </ButtonGroup>
  );
}
