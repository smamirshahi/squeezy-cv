import { useEffect, useState } from "react";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { ExportDialog } from "@pages/workspace/export-dialog";
import { JobContent } from "@pages/editor-page/sections/job-content";
import { GeneralStep } from "@pages/workspace/general-step";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { Inspector } from "@pages/workspace/inspector";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { OPEN_GENERAL_EVENT } from "@pages/workspace/general-settings-event";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";
import {
  activeVariantSelector,
  isPlaceholderSelector,
  jobsSelector,
  setJobDetails,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";

const GENERAL_STEP = "general";
const HEADER_STEP = "header";

/**
 * The right panel of "Template & content": pick a part of the job (General, the header, then
 * each section; they are independent, not a sequence). The header also has the job's status
 * and Export PDF. Only what the job shows is decided here; the layout and the
 * order of sections belong to the template. Clicking an item on the paper still opens that
 * item's own settings, like before.
 */
export function ContentPanel(): JSX.Element {
  const block = useAppSelector((s) => s.app.selectedBlock);
  const sections = useAppSelector(sectionsSelector);
  const hidden = useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const dispatch = useAppDispatch();
  const jobs = useAppSelector(jobsSelector);
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const isPlaceholder = useAppSelector(isPlaceholderSelector);
  const job = isPlaceholder
    ? undefined
    : jobs.find((entry) => entry.id === activeJobId);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [step, setStep] = useState<string>(GENERAL_STEP);
  const steps = [
    { id: GENERAL_STEP, label: "General" },
    { id: HEADER_STEP, label: "Header and links" },
    ...sections
      .filter((section) => !hidden.includes(section.id))
      .map((section) => ({ id: section.id, label: section.title })),
  ];
  const found = steps.findIndex((entry) => entry.id === step);
  const index = found === -1 ? 0 : found;

  useEffect(() => {
    function open(): void {
      setStep(GENERAL_STEP);
    }
    window.addEventListener(OPEN_GENERAL_EVENT, open);
    return () => window.removeEventListener(OPEN_GENERAL_EVENT, open);
  }, []);

  if (block) {
    return <Inspector />;
  }

  const current = steps[index];

  return (
    <ResizableAside side="right" label="the content panel" defaultWidth={480}>
      <Box
        component="aside"
        aria-label="Content"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Box
          component="header"
          sx={{
            px: 2.5,
            pt: 2,
            pb: 1.5,
            display: "grid",
            gap: 1.25,
            borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              component="h1"
              noWrap
              sx={{ fontSize: 18, fontWeight: 600, flex: 1, minWidth: 0 }}
            >
              {current.label}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={!job}
              aria-label={
                job?.stage === "ready"
                  ? "Status: Ready to apply. Back to draft"
                  : "Status: Draft. Mark as ready"
              }
              onClick={() => {
                if (job) {
                  dispatch(
                    setJobDetails({
                      id: job.id,
                      details: {
                        stage: job.stage === "ready" ? "draft" : "ready",
                      },
                    })
                  );
                }
              }}
            >
              {job?.stage === "ready"
                ? "Ready · back to draft"
                : "Draft · mark ready"}
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!job}
              startIcon={<PictureAsPdfOutlinedIcon />}
              onClick={() => setIsExportOpen(true)}
            >
              Export PDF
            </Button>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
              Section
            </Typography>
            <Select
              size="small"
              fullWidth
              value={current.id}
              inputProps={{ "aria-label": "Go to section" }}
              onChange={(event) => setStep(event.target.value)}
            >
              {steps.map((entry) => (
                <MenuItem key={entry.id} value={entry.id}>
                  {entry.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            p: 2.5,
            display: "grid",
            gap: 1.5,
            alignContent: "start",
            // Rows are as tall as their content. Without this a row can shrink to the panel's
            // height and its card (overflow: hidden) clips the content instead of the panel scrolling.
            gridAutoRows: "max-content",
          }}
        >
          {current.id === GENERAL_STEP ? (
            <GeneralStep />
          ) : (
            <>
              {/* On top in every step; in "Header and links" it scores the job titles */}
              <SectionTailor
                sectionId={
                  current.id === HEADER_STEP ? JOB_TITLES_SECTION : current.id
                }
              />
              <JobContent only={current.id} />
            </>
          )}
        </Box>

        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      </Box>
    </ResizableAside>
  );
}
