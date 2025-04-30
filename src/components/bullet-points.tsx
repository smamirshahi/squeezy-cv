import { IconWithText } from "../common/icon-with-text";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

interface Props {
  /** Texts to show as bullet points */
  bulletPoints: string[];
}

/** Component to show an array of string as bullet points  */
export function BulletPoints({ bulletPoints }: Props): JSX.Element {
  return (
    <>
      {bulletPoints.map((bulletPoint, index) => (
        <IconWithText
          key={index}
          icon={FiberManualRecordIcon}
          text={bulletPoint}
          customIconSx={{ color: "red", width: "10px" }}
        />
      ))}
    </>
  );
}
