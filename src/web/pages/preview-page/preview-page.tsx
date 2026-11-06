import { useEffect, useMemo, useRef } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { marginToPx, usePagination } from "@pages/preview-page/use-pagination";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { appSelector, setFit, setSelectedBlock } from "@store/app/app-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import {
  activeVariantSelector,
  setAutoFit,
  setPageLimit,
  setTuning,
} from "@store/variants/variants-slice";
import { FitTuning } from "@custom-types/variant-types";
import { useAutoFit } from "@pages/preview-page/use-auto-fit";
import { computeFitMetrics } from "@shared/layout/fit-metrics";
import { render } from "@shared/variant/render";
import { RenderedColumns } from "@pages/preview-page/rendered-columns";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;

  /**
   * The page as it is printed to PDF: no page count, markers or shadow, margins come from
   * the page (see `PrintView`) and the saved auto-fit result is used, not recalculated.
   */
  isPrintView?: boolean;
}

export function PreviewPage({
  contentRef,
  isPrintView = false,
}: Props): JSX.Element {
  const { structure, columnWidth } = useAppSelector(appSelector);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  // What the active variant shows, in its order and wording. The layout is the one the
  // editor currently has, so changes to it show at once.
  const rendered = useMemo(
    () => render(vault, { ...variant, layout: structure }),
    [vault, variant, structure]
  );

  const style = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();
  const pageLimit = variant.pageLimit;
  const isAutoFit = variant.isAutoFit ?? false;
  const fitMode = variant.fitMode ?? "fit";

  // The values auto-fit starts from: the style's own
  const base = useMemo<FitTuning>(
    () => ({
      spacing: 1,
      marginMm: PAPER_MARGIN_MM[style.paperMargin],
      fontScale: 1,
    }),
    [style.paperMargin]
  );
  const restartKey = useMemo(
    () =>
      JSON.stringify([
        rendered,
        style,
        columnWidth,
        pageLimit,
        fitMode,
        base,
        variant.fitLimits,
      ]),
    [rendered, style, columnWidth, pageLimit, fitMode, base, variant.fitLimits]
  );
  const fit = useAutoFit(
    {
      isEnabled: isAutoFit && !isPrintView,
      mode: fitMode,
      pageLimit,
      base,
      bodyPt: parseFloat(style.typography.bulletText.fontSize),
      limits: variant.fitLimits,
      restartKey,
    },
    (tuning) => {
      if (JSON.stringify(tuning) !== JSON.stringify(variant.tuning)) {
        dispatch(setTuning({ id: variant.id, tuning }));
      }
    }
  );
  const tuning = isPrintView ? (variant.tuning ?? base) : fit.tuning;
  const marginMm = tuning.marginMm;

  // Anything that can change how tall the content is
  const layoutKey = useMemo(
    () => ({ rendered, style, columnWidth, tuning }),
    [rendered, style, columnWidth, tuning]
  );
  /* eslint-disable @typescript-eslint/naming-convention -- CSS custom properties */
  const paperVariables = {
    "--cv-spacing": tuning.spacing,
    "--cv-font-scale": tuning.fontScale,
  } as React.CSSProperties;
  /* eslint-enable @typescript-eslint/naming-convention */
  const paperRef = useRef<HTMLDivElement | null>(null);
  const pagination = usePagination(paperRef, marginMm, layoutKey);
  const { pageCount, breaks } = pagination;
  const metrics = computeFitMetrics({
    totalHeight: pagination.usedHeight,
    pageHeight: pagination.pageHeight,
    pageLimit,
    lineHeightPx: pagination.lineHeightPx,
  });
  const { usedPercent, linesOver } = metrics;
  const overflowStartsWith = pagination.breakLabels[pageLimit - 1] ?? "";
  useEffect(() => {
    if (!isPrintView) {
      dispatch(
        setFit({
          pageCount,
          usedPercent,
          linesOver,
          lineHeightPx: pagination.lineHeightPx,
          overflowStartsWith,
        })
      );
    }
  }, [
    dispatch,
    isPrintView,
    pageCount,
    usedPercent,
    linesOver,
    pagination.lineHeightPx,
    overflowStartsWith,
  ]);

  // Clicking a part of the CV selects it; the inspector shows it
  const selectedBlock = useAppSelector((s) => s.app.selectedBlock);
  function handleSelect(event: React.MouseEvent): void {
    const target = event.target as HTMLElement;
    const itemElement = target.closest<HTMLElement>("[data-cv-item]");
    const sectionElement = target.closest<HTMLElement>("[data-cv-section]");
    dispatch(
      setSelectedBlock(
        sectionElement
          ? {
              sectionId: sectionElement.dataset.cvSection ?? "",
              itemId: itemElement?.dataset.cvItem,
            }
          : null
      )
    );
  }
  let selectedSelector = "";
  if (selectedBlock) {
    selectedSelector = selectedBlock.itemId
      ? `[data-cv-item="${selectedBlock.itemId}"]`
      : `[data-cv-section="${selectedBlock.sectionId}"]`;
  }

  // Take the next auto-fit step once the pages of what is drawn now have been measured
  const { step } = fit;
  const isFitRunning = fit.isRunning;
  useEffect(() => {
    if (isFitRunning && pagination.key === layoutKey) {
      step(pageCount);
    }
  }, [isFitRunning, pagination, layoutKey, pageCount, step]);

  return (
    <Box sx={{ flexShrink: 0, mx: "auto" }}>
      {!isPrintView && (
        <Box sx={{ mb: 1, width: `${A4_DIMENSION_MM.width}mm` }}>
          {pageCount > pageLimit ? (
            <Alert
              severity="warning"
              action={
                <>
                  {!isAutoFit && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() =>
                        dispatch(
                          setAutoFit({ id: variant.id, isAutoFit: true })
                        )
                      }
                    >
                      Auto-fit
                    </Button>
                  )}
                  {pageLimit === 1 && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() =>
                        dispatch(setPageLimit({ id: variant.id, pageLimit: 2 }))
                      }
                    >
                      Allow 2 pages
                    </Button>
                  )}
                </>
              }
            >
              This CV is {pageCount} pages long; this variant is set to{" "}
              {pageLimit}. Shorten it, hide items or change the limit.
              {linesOver > 0 && (
                <>
                  {" "}
                  {linesOver} {linesOver === 1 ? "line is" : "lines are"} over
                  {overflowStartsWith
                    ? `; page ${pageLimit + 1} starts at “${overflowStartsWith}”`
                    : ""}
                  . Nothing has been hidden or shrunk unless auto-fit is on.
                </>
              )}
            </Alert>
          ) : (
            <Typography variant="body2">
              {pageCount} {pageCount === 1 ? "page" : "pages"} (limit{" "}
              {pageLimit}) · {usedPercent}% used
            </Typography>
          )}
          {isAutoFit && fit.state.status === "does-not-fit" && (
            <Alert
              severity="warning"
              sx={{ mt: 1 }}
              action={
                <>
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      dispatch(setAutoFit({ id: variant.id, isAutoFit: false }))
                    }
                  >
                    Undo auto-fit
                  </Button>
                  {pageLimit === 1 && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() =>
                        dispatch(setPageLimit({ id: variant.id, pageLimit: 2 }))
                      }
                    >
                      Allow 2 pages
                    </Button>
                  )}
                </>
              }
            >
              This does not fit even with the smallest spacing, margins and text
              size allowed. Your CV was not cut: shorten it or hide items.
            </Alert>
          )}
          {isAutoFit && fit.changes.length > 0 && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Auto-fit changed: {fit.changes.join("; ")}
            </Typography>
          )}
        </Box>
      )}
      <Paper
        ref={(element: HTMLDivElement | null) => {
          paperRef.current = element;
          contentRef.current = element;
        }}
        elevation={3}
        style={paperVariables}
        onClick={isPrintView ? undefined : handleSelect}
        sx={{
          position: "relative",
          ...(isPrintView || !selectedSelector
            ? {}
            : {
                [`& ${selectedSelector}`]: {
                  outline: "2px solid #B8400D",
                  outlineOffset: "3px",
                  borderRadius: "2px",
                },
              }),
          ...(isPrintView
            ? {}
            : {
                "& [data-cv-item]:hover, & [data-cv-section]:hover": {
                  cursor: "pointer",
                },
              }),
          flexShrink: 0,
          ...(isPrintView
            ? {
                // The printed page has the margin, so the paper is just the text area
                width: `${A4_DIMENSION_MM.width - 2 * marginMm}mm`,
                padding: 0,
                boxShadow: "none",
              }
            : {
                width: `${A4_DIMENSION_MM.width}mm`,
                minHeight: `${A4_DIMENSION_MM.height}mm`,
                padding: `${marginMm}mm`,
              }),
          boxSizing: "border-box",
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
          // The page is always black on white, whatever the editor's theme does
          color: "#000",
          backgroundColor: "#fff",
          "& a": { color: "inherit", textDecoration: "none" },
        }}
      >
        <RenderedColumns rendered={rendered} columnWidth={columnWidth} />
        {!isPrintView &&
          breaks.map((y, index) => (
            <Box
              key={y}
              aria-hidden
              className="cv-page-marker"
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${marginToPx(marginMm) + y}px`,
                borderTop: "1px dashed #d32f2f",
                color: "#d32f2f",
                fontSize: "9pt",
                textAlign: "right",
                pointerEvents: "none",
                // eslint-disable-next-line @typescript-eslint/naming-convention -- CSS at-rule
                "@media print": { display: "none" },
              }}
            >
              Page {index + 2}
            </Box>
          ))}
      </Paper>
    </Box>
  );
}
