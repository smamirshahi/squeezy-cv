import { Box, IconButton } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

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
