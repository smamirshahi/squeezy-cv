import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ZOOM_STEP, clampZoom, setCanvasZoom } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/* eslint-disable @typescript-eslint/no-magic-numbers -- CSS: 96 px per 25.4 mm */
const A4_WIDTH_PX = (A4_DIMENSION_MM.width * 96) / 25.4;
/* eslint-enable @typescript-eslint/no-magic-numbers */
const CANVAS_PADDING_PX = 48;
const PERCENT = 100;

/** The zoom that makes the page as wide as a canvas of `canvasWidth` px */
export function fitWidthZoom(canvasWidth: number): number {
  return clampZoom((canvasWidth - CANVAS_PADDING_PX) / A4_WIDTH_PX);
}

/**
 * Shows its children scaled. The layout box is resized to the scaled size, so the canvas
 * scrolls over exactly the page. The page inside is not changed, so what is measured and
 * printed is the same at every zoom (`screenScale` in `use-pagination` accounts for it).
 */
export function ZoomFrame({
  zoom,
  children,
}: {
  zoom: number;
  children: ReactNode;
}): JSX.Element {
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const measure = (): void =>
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      sx={{
        flexShrink: 0,
        mx: "auto",
        width: size ? size.width * zoom : undefined,
        height: size ? size.height * zoom : undefined,
      }}
    >
      <Box
        ref={innerRef}
        sx={{
          width: "max-content",
          transformOrigin: "top left",
          transform: zoom === 1 ? "none" : `scale(${zoom})`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** − 100% + and "Fit width" for the canvas. Keys: + − 0. */
export function ZoomControls({
  getCanvasWidth,
}: {
  getCanvasWidth: () => number;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector((s) => s.app.canvasZoom);
  return (
    <Box
      role="group"
      aria-label="Zoom"
      sx={{
        position: "absolute",
        right: 12,
        top: 12,
        zIndex: 3,
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        px: 0.5,
        bgcolor: WORKSPACE_COLORS.panel,
        color: WORKSPACE_COLORS.text,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        borderRadius: 1,
      }}
    >
      <Tooltip title="Zoom out (−)">
        <IconButton
          size="small"
          aria-label="Zoom out"
          onClick={() => dispatch(setCanvasZoom(zoom - ZOOM_STEP))}
        >
          <RemoveIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Actual size (0)">
        <Typography
          component="button"
          aria-label="Reset zoom"
          onClick={() => dispatch(setCanvasZoom(1))}
          sx={{
            minWidth: 44,
            fontSize: 12,
            border: 0,
            bgcolor: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {Math.round(zoom * PERCENT)}%
        </Typography>
      </Tooltip>
      <Tooltip title="Zoom in (+)">
        <IconButton
          size="small"
          aria-label="Zoom in"
          onClick={() => dispatch(setCanvasZoom(zoom + ZOOM_STEP))}
        >
          <AddIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Fit the page to the width">
        <Typography
          component="button"
          aria-label="Fit width"
          onClick={() =>
            dispatch(setCanvasZoom(fitWidthZoom(getCanvasWidth())))
          }
          sx={{
            fontSize: 12,
            px: 0.75,
            border: 0,
            bgcolor: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Fit
        </Typography>
      </Tooltip>
    </Box>
  );
}
