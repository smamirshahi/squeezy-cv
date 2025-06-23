import { Box, SxProps, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PropsWithChildren, forwardRef } from "react";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import ExpandIcon from "@mui/icons-material/Expand";
import { Side } from "@custom-types/styles-types";
import { SectionId } from "@components/drag-and-drop/dnd-kit-types";
import { appSelector, setSideForSectionById } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  /** The ID of the section */
  sectionId: SectionId;

  /** Allow PreviewSection to have custom sx */
  customSx?: SxProps;
}

/** A wrapper for each section in preview mode. Adds some toggle button to align items on top of each section */
export const PreviewSection = forwardRef<
  HTMLDivElement,
  PropsWithChildren<Props>
>(function PreviewSection(
  { sectionId, children, customSx = {}, ...rest },
  ref
): JSX.Element {
  const { sides } = useAppSelector(appSelector);
  const dispatch = useAppDispatch();

  function onButtonClick(
    _event: React.MouseEvent<HTMLElement>,
    newSide: Side | null
  ): void {
    if (newSide !== null) {
      dispatch(setSideForSectionById({ sectionId, side: newSide }));
    }
  }

  return (
    <Box
      ref={ref}
      className="test-preview-section"
      sx={{
        position: "relative",
        // allow showing the buttons outside
        overflow: "visible",
        "&:hover .alignment-buttons": {
          opacity: 1,
          visibility: "visible",
        },
        ...customSx,
      }}
      {...rest}
    >
      {/* Toggle Buttons Outside Top-Right */}
      <Box
        className="alignment-buttons"
        // Stopped starting drag events when clicking the alignment buttons
        // by preventing pointer event propagation inside the button box
        onPointerDown={(e) => e.stopPropagation()}
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
          value={sides[sectionId]}
          exclusive
          onChange={onButtonClick}
          // sx={{ height: "10px" }}
          sx={{ backgroundColor: "white" }}
        >
          <ToggleButton value="left" sx={{ p: "2px" }}>
            <AlignHorizontalLeftIcon />
          </ToggleButton>
          <ToggleButton value="fullWidth" sx={{ p: "2px" }}>
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
});
