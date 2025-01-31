import { Button, ButtonGroup } from "@mui/material";
import { JSX } from "react";
import { setTemplate } from "../store/ui/ui-slice";
import { useDispatch } from "react-redux";
import { ResumeTemplates } from "../common/custom-types";

export function TemplateButton(): JSX.Element {
  const dispatch = useDispatch();

  function onClick(template: ResumeTemplates) {
    dispatch(setTemplate(template));
  }

  return (
    <ButtonGroup variant="contained" aria-label="Basic button group">
      <Button onClick={() => onClick("one-column")}>One Column</Button>
      <Button onClick={() => onClick("two-column")}>Two Column</Button>
    </ButtonGroup>
  );
}
