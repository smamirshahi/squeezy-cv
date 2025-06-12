import React from "react";
import GridLayout from "react-grid-layout";
import { Box, Paper } from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { usePreviewPageDimension } from "@hooks/use-preview-page-dimension";
import { usePreviewPageLayout } from "@hooks/use-preview-page-layout";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Have a preview page with drag and drop functionality */
export function DragDropPreviewPage({ contentRef }: Props): JSX.Element {
  const shouldShowGrids = useAppSelector(appSelector);

  const { maxRows, innerWidthPx, marginsInMM, rowHeight, defaultMargin } =
    usePreviewPageDimension({
      contentRef,
    });

  // 5) Pull in the layout / onLayoutChange from your custom hook
  const layout = usePreviewPageLayout();

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4 (210 mm × 297 mm),
        // with “narrow” 12.7 mm padding on all sides.
        width: `${A4_DIMENSION_MM.width}mm`,
        height: `${A4_DIMENSION_MM.height}mm`,
        // Hide anything outside
        overflow: "hidden",
        padding: `${marginsInMM}mm`,
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        // ensures children are clipped
        position: "relative",
      }}
    >
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={rowHeight}
        // inner width in px (after subtracting the margin from left and right)
        width={innerWidthPx}
        // enforces bottom edge
        maxRows={maxRows}
        isDraggable={true}
        isResizable={true}
        verticalCompact={false}
        preventCollision={true}
        margin={[defaultMargin, defaultMargin]}
        containerPadding={[defaultMargin, defaultMargin]}
        // onLayoutChange={onLayoutChange}
        style={{
          backgroundSize: `calc(100%/12) ${rowHeight}px`,
          backgroundImage: shouldShowGrids
            ? `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), 
            linear-gradient(to bottom, transparent ${rowHeight - 1}px, rgba(0,0,0,0.1) 1px)`
            : "none",
        }}
      >
        {layout.map((item) => (
          <Box
            key={item.i}
            sx={{
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {item.component}
          </Box>
        ))}
      </GridLayout>
    </Paper>
  );
}
