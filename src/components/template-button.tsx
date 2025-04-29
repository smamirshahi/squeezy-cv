import { Button, ButtonGroup } from "@mui/material";
import { setTemplate } from "../store/ui/ui-slice";
import { useDispatch } from "react-redux";
import { ResumeTemplates } from "../common/custom-types";
import { useReactToPrint } from "react-to-print";

interface Props {
  printReference: React.RefObject<HTMLDivElement | null>;
}

export function TemplateButton({ printReference }: Props): JSX.Element {
  const reactToPrintFn = useReactToPrint({ contentRef: printReference });
  const dispatch = useDispatch();

  function onClick(template: ResumeTemplates) {
    dispatch(setTemplate(template));
  }

  return (
    <ButtonGroup variant="contained" aria-label="Basic button group">
      <Button onClick={() => onClick("one-column")}>One Column</Button>
      <Button onClick={() => onClick("two-column")}>Two Column</Button>
      <Button onClick={() => reactToPrintFn()}>Print</Button>
      template
    </ButtonGroup>
  );
}
