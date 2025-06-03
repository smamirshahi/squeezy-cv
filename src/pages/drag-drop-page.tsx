import React from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { Box, Paper } from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { usePreviewPageDimension } from "@hooks/use-preview-page-dimension";
import { usePreviewPageLayout } from "@hooks/use-preview-page-layout";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** gap between cells, in px */
const DEFAULT_MARGIN = 10;

/** each grid‐row is 30px tall */
const ROW_HEIGHT = 30;

export function DragDropPage({ contentRef }: Props): JSX.Element {
  const { pageDimensions, maxRows } = usePreviewPageDimension({ contentRef });

  // 3) Initial layout (in grid units). You can add/remove or re‐order these items as needed.
  const { layout, onLayoutChange } = usePreviewPageLayout();

  // If you want to add/remove items dynamically, you could manage a separate array of IDs.
  // For simplicity, we just use three items ("a","b","c").

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4: 210mm × 297mm.
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        overflow: "hidden",
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        // ensures GridLayout's absolute items are clipped
        position: "relative",
      }}
    >
      <GridLayout
        className="layout"
        layout={Object.values(layout)}
        cols={12}
        rowHeight={ROW_HEIGHT}
        width={pageDimensions.width}
        // prevent any item from going below the bottom edge
        maxRows={maxRows}
        isDraggable={true}
        isResizable={true}
        // no auto‐compacting/collapsing upward
        verticalCompact={false}
        // keep cells from overlapping
        preventCollision={true}
        margin={[DEFAULT_MARGIN, DEFAULT_MARGIN]}
        containerPadding={[DEFAULT_MARGIN, DEFAULT_MARGIN]}
        onLayoutChange={onLayoutChange}
      >
        {Object.values(layout).map((item) => (
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
