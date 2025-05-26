import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";
import { Style } from "@src/custom-types/json-types";
import { setTemplate, styleSelector } from "@src/store/cv-data/cv-data-slice";

export function StylesEditorPage(): JSX.Element {
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const { template } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Styles
      </AccordionSummary>
      <AccordionDetails>
        <FormControl fullWidth>
          <InputLabel id="date-format-label">Date Format</InputLabel>
          <Select
            labelId="date-format-label"
            id="date-format"
            value={dateFormat}
            label="Date Format"
            onChange={(event) => setDateFormat(event.target.value)}
          >
            <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (01/12/2018)</MenuItem>
            <MenuItem value="MM/DD/YYYY">MMM/YYYY (Dec/2018)</MenuItem>
            <MenuItem value="YYYY-MM-DD">MMMM/YYYY (December 2018)</MenuItem>
          </Select>
        </FormControl>

        <FormControl component="fieldset">
          <Stack direction="row" alignItems="center" spacing={2}>
            <FormLabel component="legend">Template</FormLabel>
            <RadioGroup
              row
              name="template"
              value={template}
              onChange={(event) =>
                dispatch(setTemplate(event.target.value as Style["template"]))
              }
            >
              <FormControlLabel
                value="one-column"
                control={<Radio />}
                label="One-Column"
              />
              <FormControlLabel
                value="two-column"
                control={<Radio />}
                label="Two-Column"
              />
            </RadioGroup>
          </Stack>
        </FormControl>
      </AccordionDetails>
    </Accordion>
  );
}
