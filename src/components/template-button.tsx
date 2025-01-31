import { Button, ButtonGroup } from "@mui/material";
import { ResumeTemplates } from "../common/custom-types";

interface Props {
  setTemplate: (template: ResumeTemplates) => void;
}

export function TemplateButton({ setTemplate }: Props) {
  return (
    <ButtonGroup variant="contained" aria-label="Basic button group">
      <Button onClick={() => setTemplate("one-column")}>One Column</Button>
      <Button onClick={() => setTemplate("two-column")}>Two Column</Button>
      <Button onClick={() => setTemplate("three-column")}>Three Column</Button>
    </ButtonGroup>
  );
}
