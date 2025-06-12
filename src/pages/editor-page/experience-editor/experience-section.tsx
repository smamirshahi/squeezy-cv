import { BulletPoint, Experience } from "@custom-types/experience-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import {
  updateExperience,
  updateExperienceBulletPoint,
} from "@store/cv-data/cv-data-slice";

/** All the keys of experience that can be updated */
type EditableExperienceField = Pick<
  Experience,
  "jobTitle" | "company" | "location" | "startDate" | "endDate"
>;

interface UpdateExperienceSectionProps<
  K extends keyof EditableExperienceField,
> {
  /** The label to show next to it */
  label: string;

  /** The field to be updated */
  field: K;

  /** Experience that is going to be updated */
  experience: Experience;

  /** Type of text field */
  textFieldType?: "date" | "text";
}

/** Update experience section with debouncing */
export function UpdateExperienceSection<
  K extends keyof EditableExperienceField,
>({
  label,
  field,
  experience,
  textFieldType = "text",
}: UpdateExperienceSectionProps<K>): JSX.Element {
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

interface UpdateBulletPointSectionProps {
  /** Bullet point */
  bulletPoint: BulletPoint;

  /** Index of bullet point */
  bulletPointIndex: number;
}

/** Update bullet point section with debouncing */
export function UpdateBulletPointSection({
  bulletPoint,
  bulletPointIndex,
}: UpdateBulletPointSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: bulletPoint.text,
    createAction: (localState) =>
      updateExperienceBulletPoint({
        bulletPointId: bulletPoint.id,
        value: localState,
      }),
  });

  return (
    <TextField
      label={`Bullet Point ${bulletPointIndex + 1}`}
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
      fullWidth
      // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
      InputLabelProps={{ shrink: true }}
    />
  );
}
