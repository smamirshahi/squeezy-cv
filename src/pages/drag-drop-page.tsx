import React, { useEffect, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { TextField, Box, Paper } from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** gap between cells, in px */
const DEFAULT_MARGIN = 10;

/** each grid‐row is 30px tall */
const ROW_HEIGHT = 30;

export function DragDropPage({ contentRef }: Props): JSX.Element {
  // 1) Keep track of the measured pixel width/height of the A4 paper.
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateDimensions(): void {
      if (contentRef.current) {
        setDimensions({
          width: contentRef.current.clientWidth,
          height: contentRef.current.clientHeight,
        });
      }
    }

    // Measure once on mount:
    updateDimensions();
    // Re‐measure on window resize (in case mm→px changes):
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [contentRef]);

  // 2) Compute maximum number of rows so items cannot exceed the bottom.
  //    If the container height is, e.g., 1122px, and rowHeight = 30, then maxRows = 37.
  const maxRows = Math.floor(dimensions.height / ROW_HEIGHT);

  // 3) Initial layout (in grid units). You can add/remove or re‐order these items as needed.
  const [layout, setLayout] = useState<Layout[]>([
    { i: "a", x: 0, y: 0, w: 4, h: 4 },
    { i: "b", x: 4, y: 0, w: 4, h: 4 },
    { i: "c", x: 8, y: 0, w: 4, h: 4 },
  ]);

  // If you want to add/remove items dynamically, you could manage a separate array of IDs.
  // For simplicity, we just use three items ("a","b","c").

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4: 210mm × 297mm.
        width: `${A4_WIDTH_MM}mm`, // typically "210mm"
        height: `${A4_HEIGHT_MM}mm`, // typically "297mm"
        overflow: "hidden", // clip anything outside the A4 bounds
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        position: "relative", // ensures GridLayout's absolute items are clipped
      }}
    >
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={ROW_HEIGHT}
        width={dimensions.width} // use the measured pixel‐width of 210mm
        maxRows={maxRows} // prevent any item from going below the bottom edge
        isDraggable={true}
        isResizable={true}
        verticalCompact={false} // no auto‐compacting/collapsing upward
        preventCollision={true} // keep cells from overlapping
        margin={[DEFAULT_MARGIN, DEFAULT_MARGIN]}
        containerPadding={[DEFAULT_MARGIN, DEFAULT_MARGIN]}
        onLayoutChange={(newLayout: Layout[]) => setLayout(newLayout)}
      >
        {layout.map((item) => (
          <div
            key={item.i}
            style={{
              border: "1px solid #ddd",
              background: "#fafafa",
              borderRadius: 4,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 1, height: "100%", boxSizing: "border-box" }}>
              <TextField
                fullWidth
                multiline
                // Let the text area grow in height along with the grid row count.
                minRows={Math.max(1, item.h)}
                variant="outlined"
                placeholder={`Text Field ${item.i.toUpperCase()}`}
                sx={{
                  height: "100%",
                  "& .MuiInputBase-root": {
                    height: "100%",
                    alignItems: "flex-start",
                  },
                }}
              />
            </Box>
          </div>
        ))}
      </GridLayout>
    </Paper>
  );
}
