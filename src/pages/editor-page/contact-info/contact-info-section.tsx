import { TextFieldWithIcon } from "@components/text-field-with-icon";
import { ContactInfo } from "@custom-types/json-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import {
  cvDataSelector,
  updateContactInfo,
} from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface Props<K extends keyof ContactInfo> {
  /** The icon to be shown */
  icon: React.ReactNode;

  label: string;

  field: K;
}

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
    <TextFieldWithIcon
      icon={icon}
      label={label}
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
    />
  );
}
