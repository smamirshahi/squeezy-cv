import { IconWithText } from "../common/icon-with-text";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface Props {
  /** The place in which the location icon should be placed next to */
  place: string;
}

/** Shows the location icon and a text for the location next to it */
export function LocationWithIcon({ place }: Props): JSX.Element {
  return <IconWithText icon={LocationOnIcon} text={place} />;
}
