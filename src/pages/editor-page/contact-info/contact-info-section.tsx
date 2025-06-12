import { ContactInfo } from "@custom-types/contact-info-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { InputAdornment, TextField } from "@mui/material";
import {
  cvDataSelector,
  updateContactInfo,
} from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface Props<K extends keyof ContactInfo> {
  /** The icon to be shown */
  icon: React.ReactNode;

  /** The contact label */
  label: string;

  /** The filed of contact that is going to be updated */
  field: K;
}

/** A section that shows a contact info and update it with debouncing */
export function ContactInfoSection<K extends keyof ContactInfo>({
  icon,
  label,
  field,
}: Props<K>): JSX.Element {
  const { contactInfo } = useAppSelector(cvDataSelector);
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: contactInfo[field],
    createAction: (localState) =>
      updateContactInfo({ field, value: localState }),
  });

  return (
    <TextField
      label={label}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">{icon}</InputAdornment>
          ),
        },
      }}
      variant="outlined"
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
    />
  );
}
