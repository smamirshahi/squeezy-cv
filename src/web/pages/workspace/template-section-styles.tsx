import { useCallback, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { Job, CURRENT_JOB_VERSION } from "@custom-types/job-types";
import { A4_DIMENSION_MM, PAPER_MARGIN_MM } from "@custom-styles/custom-styles";
import { RenderedColumns } from "@pages/preview-page/rendered-columns";
import { ZoomFrame } from "@pages/workspace/canvas-zoom";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { render } from "@shared/variant/render";
import { resolveVariant } from "@shared/variant/template-job";
import { appSelector } from "@store/app/app-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  activeTemplateSelector,
  activeVariantSelector,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

/** Scale of the sample page before its panel has been measured */
const SAMPLE_ZOOM = 0.55;
/** The sample is cut after this many pages */
const SAMPLE_PAGES = 2;
/** CSS pixels per millimetre */
const MM_TO_PX = 96 / 25.4;
const EMPTY_SECTIONS: string[] = [];

/** A job that shows every item; only sections removed from the active job (bin) are left out */
function sampleJob(templateId: string, hiddenSections: string[]): Job {
  return {
    id: "sample",
    version: CURRENT_JOB_VERSION,
    name: "Sample",
    templateId,
    createdAt: "2000-01-01",
    tone: "neutral",
    selection: {},
    ...(hiddenSections.length > 0 ? { hiddenSections } : {}),
  };
}

/**
 * Sample CV built from the vault (everything shown, cut after two pages) so the look can be
 * judged. It fills the width of the panel it sits in, so resizing the panel resizes the page.
 */
export function TemplateSample({
  templateId,
}: {
  /** The template to draw; missing = the template of the active job */
  templateId?: string;
}): JSX.Element {
  const activeTemplate = useAppSelector(activeTemplateSelector);
  const templates = useAppSelector(templatesSelector);
  const template =
    templates.find((entry) => entry.id === templateId) ?? activeTemplate;
  const liveStyle = useAppSelector(styleSelector);
  const app = useAppSelector(appSelector);
  const { columnWidth } = app;
  // The active template is being edited: draw the editor's live layout and style.
  // Any other template is drawn as it is saved.
  const isActive = template.id === activeTemplate.id;
  const structure = isActive ? app.structure : template.layout;
  const style = isActive ? liveStyle : template.style;
  const vault = useAppSelector(vaultSelector);
  // Sections removed with the bin belong to the active job, so they are left out of its template's sample
  const removedSections =
    useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const hiddenSections = isActive ? removedSections : EMPTY_SECTIONS;
  const [available, setAvailable] = useState<number>(0);
  const observer = useRef<ResizeObserver | null>(null);
  const rendered = useMemo(
    () =>
      render(vault, {
        ...resolveVariant(template, sampleJob(template.id, hiddenSections)),
        layout: structure,
        style,
      }),
    [vault, template, structure, style, hiddenSections]
  );

  const marginMm = PAPER_MARGIN_MM[style.paperMargin];

  const measure = useCallback((node: HTMLDivElement | null): void => {
    observer.current?.disconnect();
    observer.current = null;
    if (node === null || typeof ResizeObserver === "undefined") {
      return;
    }
    setAvailable(node.clientWidth);
    observer.current = new ResizeObserver(() => setAvailable(node.clientWidth));
    observer.current.observe(node);
  }, []);

  const paperPx = A4_DIMENSION_MM.width * MM_TO_PX;
  const zoom = available > 0 ? Math.min(1, available / paperPx) : SAMPLE_ZOOM;

  return (
    <Box ref={measure} sx={{ width: "100%" }}>
      <Box
        aria-label="Sample CV"
        role="img"
        sx={{
          flex: "0 0 auto",
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          overflow: "hidden",
          width: `calc(${A4_DIMENSION_MM.width}mm * ${zoom})`,
          height: `calc(${A4_DIMENSION_MM.height * SAMPLE_PAGES}mm * ${zoom})`,
        }}
      >
        <ZoomFrame zoom={zoom}>
          <Box
            data-testid="sample-cv"
            sx={{
              width: `${A4_DIMENSION_MM.width}mm`,
              height: `${A4_DIMENSION_MM.height * SAMPLE_PAGES}mm`,
              overflow: "hidden",
              boxSizing: "border-box",
              p: `${marginMm}mm`,
              fontSize: "12pt",
              fontFamily: "Calibri, sans-serif",
              color: "#000",
              bgcolor: "#fff",
              "& a": { color: "inherit", textDecoration: "none" },
            }}
          >
            <RenderedColumns rendered={rendered} columnWidth={columnWidth} />
          </Box>
        </ZoomFrame>
      </Box>
    </Box>
  );
}
