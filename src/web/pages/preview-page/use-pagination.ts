import { RefObject, useLayoutEffect, useState } from "react";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Block, Pagination, paginate } from "@shared/layout/paginate";

/* eslint-disable @typescript-eslint/no-magic-numbers -- CSS: 96 px per 25.4 mm */
const PX_PER_MM = 96 / 25.4;
/* eslint-enable @typescript-eslint/no-magic-numbers */

const DEFAULT_LINE_HEIGHT_PX = 16;
const NORMAL_LINE_HEIGHT_RATIO = 1.2;

/** `scrollHeight` is a whole number of px; a CV that exactly fills the page must still be one page */
const ROUNDING_PX = 1;

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
): MeasuredLayout {
  const marginPx = marginMm * PX_PER_MM;
  const origin = paper.getBoundingClientRect().top + marginPx;
  const pageHeight = (A4_DIMENSION_MM.height - 2 * marginMm) * PX_PER_MM;
  // scrollHeight is rounded up to whole pixels: do not count that as another page
  const contentHeight = paper.scrollHeight - 2 * marginPx - ROUNDING_PX;
  const blocks = measureBlocks(paper, origin);
  const pagination = paginate(blocks, contentHeight, pageHeight);
  // The paper has a minimum height of one page, so its scroll height says nothing about how
  // full the page is: the bottom of the last block does.
  const lastBottom = Math.max(
    0,
    ...blocks.map((block) => block.top + block.height)
  );
  return {
    ...pagination,
    usedHeight: lastBottom + (pagination.totalHeight - contentHeight),
    pageHeight,
    lineHeightPx: measureLineHeight(paper),
    breakLabels: pagination.breaks.map((y) => labelAt(paper, origin, y)),
  };
}

const LABEL_LENGTH = 40;

/** The text of the first block at or below `y`, to say what a page starts with */
function labelAt(paper: HTMLElement, origin: number, y: number): string {
  const elements = Array.from(
    paper.querySelectorAll<HTMLElement>("[data-cv-block]")
  );
  const found = elements.find(
    (element) => element.getBoundingClientRect().top - origin >= y - 1
  );
  const text = (found?.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > LABEL_LENGTH
    ? `${text.slice(0, LABEL_LENGTH - 1)}…`
    : text;
}

/** Height of one line of body text (the first bullet), px */
function measureLineHeight(paper: HTMLElement): number {
  const sample = paper.querySelector<HTMLElement>("li[data-cv-block]");
  if (!sample) {
    return DEFAULT_LINE_HEIGHT_PX;
  }
  const style = getComputedStyle(sample);
  const lineHeight = parseFloat(style.lineHeight);
  return Number.isNaN(lineHeight)
    ? parseFloat(style.fontSize) * NORMAL_LINE_HEIGHT_RATIO
    : lineHeight;
}

/** Pixels from the top of the paper to the top of the text area */
export function marginToPx(marginMm: number): number {
  return marginMm * PX_PER_MM;
}

/** A pagination with the sizes it was measured at, which the fit numbers need */
export interface MeasuredLayout extends Pagination {
  /** Height of the text area of one page, px */
  pageHeight: number;

  /** Height of one line of body text, px */
  lineHeightPx: number;

  /** Height the text really takes (to the bottom of the last block, pushes counted), px */
  usedHeight: number;

  /** What each page after the first starts with (a short piece of its first block) */
  breakLabels: string[];
}

/** The pagination of the content that was measured, with the `contentKey` it was measured for */
export interface MeasuredPagination extends MeasuredLayout {
  key: unknown;
}

const SINGLE_PAGE: MeasuredPagination = {
  pageCount: 1,
  breaks: [],
  totalHeight: 0,
  usedHeight: 0,
  pageHeight: 1,
  lineHeightPx: DEFAULT_LINE_HEIGHT_PX,
  breakLabels: [],
  key: null,
};

/**
 * The page count and page starts of the CV shown in `paperRef`. Measured after every
 * render of the content, and again when the paper is resized or the fonts have loaded.
 */
export function usePagination(
  paperRef: RefObject<HTMLElement | null>,
  marginMm: number,
  contentKey: unknown
): MeasuredPagination {
  const [pagination, setPagination] = useState<MeasuredPagination>(SINGLE_PAGE);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) {
      return undefined;
    }
    function update(): void {
      if (!paper) {
        return;
      }
      const measured = measurePagination(paper, marginMm);
      setPagination((previous) =>
        previous.key === contentKey &&
        JSON.stringify({ ...previous, key: 0 }) ===
          JSON.stringify({ ...measured, key: 0 })
          ? previous
          : { ...measured, key: contentKey }
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
