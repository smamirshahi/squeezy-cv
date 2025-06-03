import React, { useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { TextField, Box, Paper } from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_MARGIN = 10;

export function DragDropPage({ contentRef }: Props): JSX.Element {
  // initial layout: an array of items with grid positions/sizes
  // x, y, w, h are in grid units
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
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        // Prevent items from being “static”; allow dragging/resizing:
        isDraggable={true}
        isResizable={true}
        // Disable any “compact” (collision-based) behavior that might shift items unexpectedly:
        verticalCompact={false}
        // Prevent items from being dropped out of bounds
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
            }}
          >
            <Box sx={{ p: 1, height: "100%", boxSizing: "border-box" }}>
              <TextField
                fullWidth
                multiline
                // roughly let height grow with grid‐rows
                minRows={Math.max(1, item.h * 1)}
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
