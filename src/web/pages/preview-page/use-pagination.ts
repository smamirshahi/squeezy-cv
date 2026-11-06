import { RefObject, useLayoutEffect, useState } from "react";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Block, Pagination, paginate } from "@shared/layout/paginate";

/* eslint-disable @typescript-eslint/no-magic-numbers -- CSS: 96 px per 25.4 mm */
const PX_PER_MM = 96 / 25.4;
/* eslint-enable @typescript-eslint/no-magic-numbers */

/** Where the blocks (`data-cv-block`) inside `root` are, in px from `originTop` */
export function measureBlocks(root: HTMLElement, originTop: number): Block[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-cv-block]")).map(
    (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top - originTop,
        height: rect.height,
        shouldKeepWithNext: element.hasAttribute("data-cv-keep"),
      };
    }
  );
}

/** Measures the paper as it is laid out now and works out where its pages break */
export function measurePagination(
  paper: HTMLElement,
  marginMm: number
): Pagination {
  const marginPx = marginMm * PX_PER_MM;
  const origin = paper.getBoundingClientRect().top + marginPx;
  const pageHeight = (A4_DIMENSION_MM.height - 2 * marginMm) * PX_PER_MM;
  const contentHeight = paper.scrollHeight - 2 * marginPx;
  return paginate(measureBlocks(paper, origin), contentHeight, pageHeight);
}

/** Pixels from the top of the paper to the top of the text area */
export function marginToPx(marginMm: number): number {
  return marginMm * PX_PER_MM;
}

const SINGLE_PAGE: Pagination = { pageCount: 1, breaks: [] };

/**
 * The page count and page starts of the CV shown in `paperRef`. Measured after every
 * render of the content, and again when the paper is resized or the fonts have loaded.
 */
export function usePagination(
  paperRef: RefObject<HTMLElement | null>,
  marginMm: number,
  contentKey: unknown
): Pagination {
  const [pagination, setPagination] = useState<Pagination>(SINGLE_PAGE);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) {
      return undefined;
    }
    function update(): void {
      if (!paper) {
        return;
      }
      const next = measurePagination(paper, marginMm);
      setPagination((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next
      );
    }
    update();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);
    observer?.observe(paper);
    void document.fonts?.ready.then(update);
    return () => observer?.disconnect();
  }, [paperRef, marginMm, contentKey]);

  return pagination;
}
