import React from "react";
import GridLayout from "react-grid-layout";
import { Box, Paper } from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { usePreviewPageDimension } from "@hooks/use-preview-page-dimension";
import { usePreviewPageLayout } from "@hooks/use-preview-page-layout";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** gap between cells, in px */
const DEFAULT_MARGIN = 10;

/** each grid‐row is 30px tall */
const ROW_HEIGHT = 30;

/** how much Paper padding we’ve given on each side (in mm) */
const NARROW_MARGINS_MM = 12.7;
// const NORMAL_MARGINS_MM = 25.4;

/** Convert mm → px, knowing px/mm from pageDimensions */
function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

export function DragDropPage({ contentRef }: Props): JSX.Element {
  // 1) Get the Paper’s pixel‐dimensions (including its padding) from the hook.
  //    e.g. { width: ~794, height: ~1123 } if 210×297 mm → ~794×1123 px at 96dpi.
  const { pageDimensions } = usePreviewPageDimension({ contentRef });
  //    pageDimensions.width  = Paper’s clientWidth  in px  (includes 12.7 mm padding left+right)
  //    pageDimensions.height = Paper’s clientHeight in px  (includes 12.7 mm padding top+bottom)

  // 2) Figure out px/mm so we can subtract exactly 12.7 mm top/bottom
  const pxPerMm = pageDimensions.width / A4_WIDTH_MM;
  const paperPaddingPx = mmToPx(NARROW_MARGINS_MM, pxPerMm);

  // 3) Compute the inner area (inside the 12.7 mm padding) in px:
  const innerWidthPx = Math.max(0, pageDimensions.width - 2 * paperPaddingPx);
  const innerHeightPx = Math.max(0, pageDimensions.height - 2 * paperPaddingPx);

  // 4) Now compute maxRows so that:
  //      innerHeightPx ≥ 2*containerPaddingPx + (maxRows*ROW_HEIGHT) + ((maxRows−1)*marginPx)
  //    Rearranged:
  //      maxRows ≤ floor((innerHeightPx − 2*containerPaddingPx + marginPx) / (ROW_HEIGHT + marginPx))
  //
  //    Since:
  //      containerPaddingPx = DEFAULT_MARGIN (10px on top AND 10px on bottom),
  //      marginPx         = DEFAULT_MARGIN (10px between rows),
  //
  //    we get:

  // top AND bottom
  const containerPadPx = DEFAULT_MARGIN;

  // vertical gap between rows
  const marginPx = DEFAULT_MARGIN;

  const computedMaxRows = Math.max(
    0,
    Math.floor(
      (innerHeightPx - 2 * containerPadPx + marginPx) / (ROW_HEIGHT + marginPx)
    )
  );

  // 5) Pull in the layout / onLayoutChange from your custom hook
  const { layout, onLayoutChange } = usePreviewPageLayout();

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4 (210 mm × 297 mm),
        // with “narrow” 12.7 mm padding on all sides.
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        // Hide anything outside
        overflow: "hidden",
        padding: `${NARROW_MARGINS_MM}mm`,
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
        layout={Object.values(layout)}
        cols={12}
        rowHeight={ROW_HEIGHT}
        // inner width in px (after subtracting the margin from left and right)
        width={innerWidthPx}
        // enforces bottom edge
        maxRows={computedMaxRows}
        isDraggable={true}
        isResizable={true}
        verticalCompact={false}
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
