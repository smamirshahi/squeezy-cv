import { useEffect, useMemo, useRef } from "react";
import { Alert, Box, Paper, Typography } from "@mui/material";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { GenericSectionPreviewPage } from "@pages/preview-page/generic-section-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { marginToPx, usePagination } from "@pages/preview-page/use-pagination";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  appSelector,
  setPageCount,
  setSelectedBlock,
} from "@store/app/app-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import {
  activeVariantSelector,
  setTuning,
} from "@store/variants/variants-slice";
import { FitTuning } from "@custom-types/variant-types";
import { useAutoFit } from "@pages/preview-page/use-auto-fit";
import { RenderedPart, render } from "@shared/variant/render";

/** Renders one part of the CV: the header parts, or a section by its type */
function renderPart(part: RenderedPart): JSX.Element | null {
  switch (part.kind) {
    case "personalInfo":
      return <PersonalInfoPreviewPage key={part.id} />;
    case "contactInfo":
      return <ContactInfoPreviewPage key={part.id} />;
    case "section":
      switch (part.type) {
        case "summary":
          return <SummaryPreviewPage key={part.id} section={part} />;
        case "experience":
          return <ExperiencesPreviewPage key={part.id} section={part} />;
        case "education":
          return <EducationsPreviewPage key={part.id} section={part} />;
        case "skills":
          return <SkillsPreviewPage key={part.id} section={part} />;
        default:
          return <GenericSectionPreviewPage key={part.id} section={part} />;
      }
  }
}

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
      JSON.stringify([rendered, style, columnWidth, pageLimit, fitMode, base]),
    [rendered, style, columnWidth, pageLimit, fitMode, base]
  );
  const fit = useAutoFit(
    {
      isEnabled: isAutoFit && !isPrintView,
      mode: fitMode,
      pageLimit,
      base,
      bodyPt: parseFloat(style.typography.bulletText.fontSize),
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
  useEffect(() => {
    if (!isPrintView) {
      dispatch(setPageCount(pageCount));
    }
  }, [dispatch, isPrintView, pageCount]);

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
            <Alert severity="warning">
              This CV is {pageCount} pages long; this variant is set to{" "}
              {pageLimit}. Shorten it, hide items or change the limit.
            </Alert>
          ) : (
            <Typography variant="body2">
              {pageCount} {pageCount === 1 ? "page" : "pages"} (limit{" "}
              {pageLimit})
            </Typography>
          )}
          {isAutoFit && fit.state.status === "does-not-fit" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              This does not fit even with the smallest spacing, margins and text
              size allowed. Shorten the CV or hide items.
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
        <Box>
          {/* Full-width top row */}
          <Box
            sx={{
              width: "100%",
              mb: 2,
            }}
          >
            {rendered.columns.fullWidth.map(renderPart)}
          </Box>

          {/* Second row: left and right with percentages */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10mm",
            }}
          >
            <Box
              sx={{
                flexBasis: `${columnWidth.left}%`,
                flexGrow: 0,
                flexShrink: 1,
              }}
            >
              {rendered.columns.left.map(renderPart)}
            </Box>
            <Box
              sx={{
                flexBasis: `${columnWidth.right}%`,
                flexGrow: 0,
                flexShrink: 1,
              }}
            >
              {rendered.columns.right.map(renderPart)}
            </Box>
          </Box>
        </Box>
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
