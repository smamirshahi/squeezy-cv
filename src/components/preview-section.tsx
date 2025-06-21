import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PropsWithChildren, useState } from "react";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import ExpandIcon from "@mui/icons-material/Expand";
import { Side } from "@custom-types/styles-types";

interface Props {
  /** The initial side of a section */
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
      className="test-preview-section"
      sx={{
        position: "relative",
        // allow showing the buttons outside
        overflow: "visible",
        "&:hover .alignment-buttons": {
          opacity: 1,
          visibility: "visible",
        },
      }}
    >
      {/* Toggle Buttons Outside Top-Right */}
      <Box
        className="alignment-buttons"
        sx={{
          position: "absolute",
          // move above the container
          top: -32,
          right: -8,
          opacity: 0,
          visibility: "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
          zIndex: 1,
        }}
      >
        <ToggleButtonGroup
          value={side}
          exclusive
          onChange={onButtonClick}
          // sx={{ height: "10px" }}
          sx={{ backgroundColor: "white" }}
        >
          <ToggleButton value="left" sx={{ p: "2px" }}>
            <AlignHorizontalLeftIcon />
          </ToggleButton>
          <ToggleButton value="center" sx={{ p: "2px" }}>
            <ExpandIcon sx={{ transform: "rotate(90deg)" }} />
          </ToggleButton>
          <ToggleButton value="right" sx={{ p: "2px" }}>
            <AlignHorizontalRightIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
