import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
} from "@mui/material";
import { Style } from "@src/custom-types/json-types";
import { setTemplate, styleSelector } from "@src/store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";

export function TemplateEditorPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const { template } = useAppSelector(styleSelector);

  return (
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
  );
}
