import { BulletPoint, Experience } from "@custom-types/experience-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import {
  updateExperience,
  updateExperienceBulletPoint,
} from "@store/cv-data/cv-data-slice";

type EditableExperienceField = Pick<
  Experience,
  "jobTitle" | "company" | "location" | "startDate" | "endDate"
>;

interface UpdateExperienceSectionProps<
  K extends keyof EditableExperienceField,
> {
  label: string;

  field: K;

  experience: Experience;

  textFieldType?: "date" | "text";
}

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
  experience: Experience;
  bulletPoint: BulletPoint;
  bulletPointIndex: number;
}

export function UpdateBulletPointSection({
  experience,
  bulletPoint,
  bulletPointIndex,
}: UpdateBulletPointSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: bulletPoint.text,
    createAction: (localState) =>
      updateExperienceBulletPoint({
        experienceId: experience.id,
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
