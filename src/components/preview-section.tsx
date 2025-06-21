import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PropsWithChildren, useState } from "react";
import { Side } from "@components/drag-and-drop/dnd-kit-types";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import ExpandIcon from "@mui/icons-material/Expand";

interface Props {
  initialSide: Side;
}

export function PreviewSection({
  initialSide,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const [side, setSide] = useState<Side>(initialSide);

  function onButtonClick(
    _event: React.MouseEvent<HTMLElement>,
    newSide: Side | null
  ): void {
    if (newSide !== null) {
      setSide(newSide);
    }
  }

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        "&:hover .alignment-buttons": {
          opacity: 1,
          visibility: "visible",
        },
      }}
    >
      {/* Hidden Toggle Button Group on Top Right */}
      <Box
        className="alignment-buttons"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          opacity: 0,
          visibility: "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
        }}
      >
        <ToggleButtonGroup
          value={side}
          exclusive
          onChange={onButtonClick}
          aria-label="text alignment"
        >
          <ToggleButton value="left" aria-label="left aligned">
            <AlignHorizontalLeftIcon />
          </ToggleButton>
          <ToggleButton value="center" aria-label="centered">
            <ExpandIcon />
          </ToggleButton>
          <ToggleButton value="right" aria-label="right aligned">
            <AlignHorizontalRightIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {/* Content Area */}
      <Box
        sx={{
          width: "100%",
          height: "100%",
          p: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
