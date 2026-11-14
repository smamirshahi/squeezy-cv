import { Box, IconButton } from "@components/ui";
import {
  ArrowDownwardOutlined as ArrowDownwardIcon,
  ArrowUpwardOutlined as ArrowUpwardIcon,
} from "@components/ui/icons";

interface Props {
  index: number;
  swapFunction: (index1: number, index2: number) => void;
  isLastEntity: boolean;
}

export function SortingIcons({
  index,
  swapFunction,
  isLastEntity,
}: Props): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
      }}
    >
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          swapFunction(index, index - 1);
        }}
        disabled={index === 0}
      >
        <ArrowUpwardIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          swapFunction(index, index + 1);
        }}
        disabled={isLastEntity}
      >
        <ArrowDownwardIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
