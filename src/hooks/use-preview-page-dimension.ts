import { A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { useEffect, useState } from "react";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;

  /** The type of margin around the page */
  marginType: "narrow" | "normal";
}

/** distance between grid lines, in pixels */
const gridUnitPx = 20;

/** gap between cells, in px */
const defaultMargin = 10;

/** The measured pixel width/height of the A4 paper */
interface PageDimensionProps {
  /** Paper’s clientWidth in px (includes margins in mm from left+right) */
  width: number;

  /** Paper’s clientHeight in px (includes margins in mm from left+right) */
  height: number;
}

interface ReturnProps {
  /** Maximum number of rows that can fit in the A4 paper height */
  maxRows: number;

  innerWidthPx: number;

  marginsInMM: number;

  defaultMargin: number;

  gridUnitPx: number;

  computedCols: number;
}

function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

/**
 * Get the Paper’s pixel‐dimensions (including its padding).
 *  e.g. { width: ~794, height: ~1123 } if 210×297 mm → ~794×1123 px at 96dpi.
 */
export function usePreviewPageDimension({
  contentRef,
  marginType,
}: Props): ReturnProps {
  // 1) Keep track of the measured pixel width/height of the A4 paper.
  const [pageDimensions, setPageDimensions] = useState<PageDimensionProps>({
    width: 0,
    height: 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const marginsInMM = marginType === "normal" ? 25.4 : 12.7;

  // This is necessary because the A4 paper size is defined in mm, but we need pixel values for the grid layout.
  useEffect(() => {
    function updateDimensions(): void {
      if (contentRef.current) {
        setPageDimensions({
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

  // 2) Figure out px/mm so we can subtract exactly 12.7 mm top/bottom
  const pxPerMm = pageDimensions.width / A4_WIDTH_MM;
  const paperPaddingPx = mmToPx(marginsInMM, pxPerMm);

  // 3) Compute the inner area (inside the 12.7 mm padding) in px:
  const innerWidthPx = Math.max(0, pageDimensions.width - 2 * paperPaddingPx);
  const innerHeightPx = Math.max(0, pageDimensions.height - 2 * paperPaddingPx);

  // 3) Compute cols by dividing innerWidth by GRID_UNIT_PX:
  const computedCols = Math.max(1, Math.floor(innerWidthPx / gridUnitPx));

  // 4) Compute maxRows similarly (using ROW_HEIGHT = GRID_UNIT_PX):
  const maxRows = Math.max(
    0,
    Math.floor(
      (innerHeightPx - 2 * defaultMargin + defaultMargin) /
        (gridUnitPx + defaultMargin)
    )
  );

  return {
    innerWidthPx,
    maxRows,
    marginsInMM,
    defaultMargin,
    gridUnitPx,
    computedCols,
  };
}
