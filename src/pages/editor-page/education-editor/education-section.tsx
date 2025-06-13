import { Education } from "@custom-types/education-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import { updateEducation } from "@store/cv-data/cv-data-slice";

interface UpdateEducationSectionProps<K extends keyof Education> {
  /** The label to show next to it */
  label: string;

  /** The field to be updated */
  field: K;

  /** Education that is going to be updated */
  education: Education;

  /** Type of text field */
  textFieldType?: "date" | "text";
}

/** Update education section with debouncing */
export function UpdateEducationSection<K extends keyof Education>({
  label,
  field,
  education,
  textFieldType = "text",
}: UpdateEducationSectionProps<K>): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: education[field],
    createAction: (value) =>
      updateEducation({
        educationId: education.id,
        key: field,
        value,
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
