import { InfoOutlined as InfoOutlineIcon } from "@components/ui/icons";
import { IconButton, Tooltip } from "@components/ui";

interface Props {
  /** Text to show on hover */
  infoText: string;
}

/** Shows the information icon with a text in hover */
export function InformationTooltip({ infoText }: Props): JSX.Element {
  return (
    <Tooltip title={infoText}>
      <IconButton>
        <InfoOutlineIcon />
      </IconButton>
    </Tooltip>
  );
}
