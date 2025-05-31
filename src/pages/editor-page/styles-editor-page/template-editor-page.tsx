import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/json-types";
import { setTemplate, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

export function TemplateEditorPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const { template } = useAppSelector(styleSelector);

  return (
    <FormControl fullWidth>
      <InputLabel id="template-label">Template Selection</InputLabel>
      <Select
        labelId="template-label"
        id="template-format"
        value={template}
        label="Template"
        onChange={(event) =>
          dispatch(setTemplate(event.target.value as Style["template"]))
        }
      >
        <MenuItem value="one-column">One-Column</MenuItem>
        <MenuItem value="two-column">Two-Column</MenuItem>
      </Select>
    </FormControl>
  );
}
