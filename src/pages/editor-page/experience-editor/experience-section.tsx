import { Experience } from "@custom-types/json-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import { updateExperience } from "@store/cv-data/cv-data-slice";

type EditableExperienceField = Pick<
  Experience,
  "jobTitle" | "company" | "location" | "startDate" | "endDate"
>;

interface Props<K extends keyof EditableExperienceField> {
  label: string;

  field: K;

  experience: Experience;

  textFieldType?: "date" | "text";
}

export function UpdateExperienceSection<
  K extends keyof EditableExperienceField,
>({ label, field, experience, textFieldType = "text" }: Props<K>): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: experience[field],
    createAction: (localState) =>
      updateExperience({
        experienceId: experience.id,
        key: field,
        value: localState,
      }),
  });

  return (
    <TextField
      type={textFieldType}
      label={label}
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
      fullWidth
      // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
      InputLabelProps={{ shrink: true }}
    />
  );
}
