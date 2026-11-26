import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useViewport } from "@hooks/use-viewport";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from "@components/ui";
import {
  ExpandLessOutlined,
  ExpandMoreOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@components/ui/icons";
import { useStore } from "react-redux";
import { documentText } from "@shared/variant/document-text";
import { render } from "@shared/variant/render";
import { exportChecks, suggestFileName } from "@shared/export/export-checks";
import { fixList } from "@shared/ats/ats-score";
import { useAts } from "@pages/workspace/ats/use-ats";
import { MarkAsAppliedDialog } from "@pages/applications-page/mark-as-applied";
import { saveActiveJob } from "@hooks/save-active-job";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { createApiClient } from "@store/persistence/api-client";
import { isBrowserMode } from "@store/persistence/browser/storage-mode";
import { RootState, useAppSelector } from "@store/store-helper";
import {
  activeTemplateSelector,
  activeVariantSelector,
} from "@store/jobs/jobs-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";

const EXPORT_FIX_COUNT = 3;
/** A4 at 96 dpi, plus room for the scrollbar of the frame */
const PAGE_WIDTH_PX = 794 + 16;
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Browser mode: the preview is our own print page, so its content can be zoomed from here */
function applyPageZoom(frame: HTMLIFrameElement | null, scale: number): void {
  if (!isBrowserMode()) {
    return;
  }
  const doc = frame?.contentDocument;
  if (!doc?.documentElement || !doc.body) {
    return;
  }
  doc.documentElement.style.setProperty("zoom", String(scale));
  doc.body.style.width = "210mm";
  doc.body.style.margin = "0 auto";
  // A different background around the paper shows where the page ends
  doc.documentElement.style.background = WORKSPACE_COLORS.canvas;
  doc.body.style.background = "#fff";
  doc.body.style.boxShadow = "0 0 6px rgba(0, 0, 0, 0.25)";
}

/**
 * Export PDF: saves the job, asks the server for the real PDF and shows it before it
 * is downloaded, with the checks that matter for sending a CV.
 */
export function ExportDialog({ isOpen, onClose }: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const template = useAppSelector(activeTemplateSelector);
  const fit = useAppSelector((s) => s.app.fit);
  const { handleExport } = useImportExportJson();
  const ats = useAts();
  const atsFixes = fixList(ats.live.issues).slice(0, EXPORT_FIX_COUNT);

  // `blob` is missing in browser mode: the preview is the print page and the browser makes the PDF
  const [pdf, setPdf] = useState<{ blob?: Blob; url: string } | null>(null);
  const previewFrame = useRef<HTMLIFrameElement | null>(null);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isAlsoJson, setIsAlsoJson] = useState<boolean>(false);
  const [isMarkAfter, setIsMarkAfter] = useState<boolean>(false);
  const [isMarkOpen, setIsMarkOpen] = useState<boolean>(false);
  const [isAtsOpen, setIsAtsOpen] = useState<boolean>(false);
  // null = the page fits the width of the preview, so there is no horizontal scrollbar
  const [zoom, setZoom] = useState<number | null>(null);
  const [previewBox, setPreviewBox] = useState<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!previewBox || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() =>
      setPreviewSize({
        width: previewBox.clientWidth,
        height: previewBox.clientHeight,
      })
    );
    observer.observe(previewBox);
    return () => observer.disconnect();
  }, [previewBox]);

  const fitZoom = previewSize.width
    ? Math.min(1, previewSize.width / PAGE_WIDTH_PX)
    : 1;
  const scale = zoom ?? fitZoom;
  useEffect(() => {
    applyPageZoom(previewFrame.current, scale);
  }, [scale, pdf]);
  function changeZoom(delta: number): void {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta)));
  }

  // Make the PDF each time the dialog opens
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    let isCancelled = false;
    let url = "";
    setPdf(null);
    setError("");
    setFileName(suggestFileName(vault.profile.fullName, variant.name));
    setIsMarkAfter(false);
    setZoom(null);
    void (async () => {
      try {
        const saved = await saveActiveJob(store, api);
        if (isBrowserMode()) {
          if (!isCancelled) {
            setPdf({ url: `/print/${encodeURIComponent(saved.id)}` });
          }
          return;
        }
        const blob = await api.createPdf(saved.id);
        url = URL.createObjectURL(blob);
        if (!isCancelled) {
          setPdf({ blob, url });
        }
      } catch (caught) {
        if (!isCancelled) {
          setError(
            caught instanceof Error ? caught.message : "The PDF failed."
          );
        }
      }
    })();
    return () => {
      isCancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
    // Only when it opens: the numbers below keep following the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hiddenItemCount = Object.values(variant.selection).filter(
    (choice) => choice.isVisible === false
  ).length;
  const isPhotoShown = useAppSelector(styleSelector).shouldShowPhoto !== false;
  const checks = exportChecks({
    // A photo that is switched off in the style is not in the PDF, so it is not a warning
    profile: isPhotoShown
      ? vault.profile
      : { ...vault.profile, photo: undefined },
    pageCount: fit.pageCount,
    pageLimit: variant.pageLimit,
    usedPercent: fit.usedPercent,
    linesOver: fit.linesOver,
    hiddenItemCount,
    tailor: variant.tailor,
    cvText: documentText(render(vault, variant)),
  });

  function download(): void {
    if (!pdf) {
      return;
    }
    if (isBrowserMode()) {
      // The browser's own "Save as PDF": its print dialog, with the file name suggested
      const frame = previewFrame.current;
      if (!frame?.contentWindow) {
        return;
      }
      frame.contentDocument!.title = fileName || "CV";
      frame.contentWindow.print();
    } else {
      const link = document.createElement("a");
      link.href = pdf.url;
      link.download = `${fileName || "CV"}.pdf`;
      link.click();
    }
    if (isAlsoJson) {
      handleExport(fileName || "CV");
    }
    onClose();
    if (isMarkAfter) {
      // the PDF was saved from the saved job, so the application records exactly this CV
      setIsMarkOpen(true);
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        fullScreen={isPhone}
      >
        <DialogTitle>
          Export PDF · {variant.name} · {template.name}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            pt: "8px !important",
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", md: 620, lg: 860 },
              alignSelf: "stretch",
              flex: "none",
              display: "flex",
              flexDirection: "column",
              // A fixed height: the frame inside follows this box, never the other way round
              height: { xs: "55vh", md: "calc(100vh - 260px)" },
              minHeight: { xs: 360, md: 480 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 0.5,
              }}
            >
              <IconButton
                aria-label="Zoom out"
                onClick={() => changeZoom(-ZOOM_STEP)}
                disabled={scale <= ZOOM_MIN}
              >
                <ZoomOutOutlined />
              </IconButton>
              <Button onClick={() => setZoom(null)}>
                {Math.round(scale * 100)}% · Fit
              </Button>
              <IconButton
                aria-label="Zoom in"
                onClick={() => changeZoom(ZOOM_STEP)}
                disabled={scale >= ZOOM_MAX}
              >
                <ZoomInOutlined />
              </IconButton>
            </Box>
            <Box
              ref={setPreviewBox}
              sx={{
                flex: 1,
                minHeight: 0,
                bgcolor: WORKSPACE_COLORS.canvas,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pdf ? (
                <iframe
                  ref={previewFrame}
                  title="PDF preview"
                  src={
                    isBrowserMode()
                      ? pdf.url
                      : `${pdf.url}#toolbar=0&navpanes=0&${
                          zoom === null
                            ? "view=FitH"
                            : `zoom=${Math.round(scale * 100)}`
                        }`
                  }
                  // The frame keeps its size and its own scrollbars; only the page inside zooms
                  onLoad={() => applyPageZoom(previewFrame.current, scale)}
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              ) : (
                !error && <CircularProgress aria-label="Making the PDF" />
              )}
            </Box>
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="File name"
              size="small"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              helperText={
                isBrowserMode()
                  ? 'In the print window choose "Save as PDF" as the printer'
                  : "Saved with .pdf"
              }
            />
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Checks
              </Typography>
              {checks.map((check) => (
                <Box
                  key={check.id}
                  sx={{
                    py: 0.75,
                    borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                    {check.level === "ok" ? "✓" : "⚠"} {check.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {check.detail}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box data-testid="export-ats">
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                ATS score
              </Typography>
              <Box
                sx={{
                  py: 0.75,
                  borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                }}
              >
                <ButtonBase
                  onClick={() => setIsAtsOpen((open) => !open)}
                  aria-expanded={isAtsOpen}
                  aria-controls="export-ats-details"
                  sx={{
                    width: "100%",
                    justifyContent: "space-between",
                    textAlign: "left",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 14 }}>
                      Your CV: {ats.live.cv.score} of 100
                    </Typography>
                    {ats.live.match && (
                      <Typography sx={{ fontSize: 14 }}>
                        Match to this job: {ats.live.match.score} of 100
                      </Typography>
                    )}
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      Final result: {ats.live.total} of 100
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {ats.live.match
                        ? "The average of the two scores above"
                        : "No job requirements to match, so this is Your CV alone"}
                    </Typography>
                  </Box>
                  {isAtsOpen ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
                </ButtonBase>
                <Collapse in={isAtsOpen} unmountOnExit>
                  <Box
                    id="export-ats-details"
                    sx={{ maxHeight: 200, overflowY: "auto", pr: 1 }}
                  >
                    {atsFixes.map((fix) => (
                      <Typography
                        key={fix.key}
                        sx={{ fontSize: 12, color: "text.secondary" }}
                      >
                        ⚠ {fix.title}
                      </Typography>
                    ))}
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      A guide, not a guarantee: real ATS systems differ. Open
                      the ATS score in Apply for all the reasons.
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAlsoJson}
                  onChange={(event) => setIsAlsoJson(event.target.checked)}
                />
              }
              label="Also save the data (.json) with the PDF"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isMarkAfter}
                  onChange={(event) => setIsMarkAfter(event.target.checked)}
                />
              }
              label="Then mark this as applied"
            />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {isBrowserMode()
                ? "Made in this browser."
                : "Made on this computer."}{" "}
              After downloading you are asked for the company and role, and the
              CV is saved exactly as sent.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!pdf} onClick={download}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
      <MarkAsAppliedDialog
        isOpen={isMarkOpen}
        onClose={() => setIsMarkOpen(false)}
        initialRole={variant.tailor?.jobTitle}
      />
    </>
  );
}
