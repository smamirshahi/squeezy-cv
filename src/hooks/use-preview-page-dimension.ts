import { useEffect, useState } from "react";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** each grid‐row is 30px tall */
const ROW_HEIGHT = 30;

interface ReturnProps {
  /** The measured pixel width/height of the A4 paper */
  pageDimensions: { width: number; height: number };
  /** Maximum number of rows that can fit in the A4 paper height */
  maxRows: number;
}

export function usePreviewPageDimension({ contentRef }: Props): ReturnProps {
  // 1) Keep track of the measured pixel width/height of the A4 paper.
  const [pageDimensions, setPageDimensions] = useState<
    ReturnProps["pageDimensions"]
  >({ width: 0, height: 0 });

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

  // 2) Compute maximum number of rows so items cannot exceed the bottom.
  //    If the container height is, e.g., 1122px, and rowHeight = 30, then maxRows = 37.
  const maxRows = Math.floor(pageDimensions.height / ROW_HEIGHT);

  return {
    pageDimensions,
    maxRows,
  };
}
