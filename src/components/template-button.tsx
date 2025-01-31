import { Button, ButtonGroup } from "@mui/material";
import { JSX, useEffect } from "react";
import { setTemplate } from "../store/ui/ui-slice";
import { useDispatch } from "react-redux";
import { setApplicant } from "../store/applicant/applicant-slice";
import { Applicant } from "../applicant";

export function TemplateButton(): JSX.Element {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setApplicant(Applicant));
  }, [dispatch]);

  return (
    <ButtonGroup variant="contained" aria-label="Basic button group">
      <Button onClick={() => dispatch(setTemplate("one-column"))}>
        One Column
      </Button>
      <Button onClick={() => dispatch(setTemplate("two-column"))}>
        Two Column
      </Button>
      <Button onClick={() => dispatch(setTemplate("three-column"))}>
        Three Column
      </Button>
    </ButtonGroup>
  );
}
