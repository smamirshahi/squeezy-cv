import { Education } from "@custom-types/education-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import { updateEducation } from "@store/cv-data/cv-data-slice";

interface UpdateEducationSectionProps<K extends keyof Education> {
  label: string;

  field: K;

  education: Education;

  textFieldType?: "date" | "text";
}

export function UpdateEducationSection<K extends keyof Education>({
  label,
  field,
  education,
  textFieldType = "text",
}: UpdateEducationSectionProps<K>): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: education[field],
    createAction: (localState) =>
      updateEducation({
        educationId: education.id,
        key: field,
        value: localState,
      }),
  });

  return (
    <TextField
      type={textFieldType}
      label={label}
      value={localState}
      onChange={(event) => setLocalState(event.target.value as Education[K])}
      fullWidth
      // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
      InputLabelProps={{ shrink: true }}
    />
  );
}
