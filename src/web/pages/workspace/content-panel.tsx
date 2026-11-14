import { useEffect, useState } from "react";
import { Box, Button, Menu, MenuItem, Typography } from "@components/ui";
import {
  FileDownloadOutlined as FileDownloadOutlinedIcon,
  KeyboardArrowDownOutlined as KeyboardArrowDownIcon,
} from "@components/ui/icons";
import { ExportDialog } from "@pages/workspace/export-dialog";
import { JobContent } from "@pages/editor-page/sections/job-content";
import { GeneralStep } from "@pages/workspace/general-step";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { Inspector } from "@pages/workspace/inspector";
import { useViewport } from "@hooks/use-viewport";
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
 * The right panel of "Template & content": go through the job one step at a time (the
 * header, then each section). Only what the job shows is decided here; the layout and the
 * order of sections belong to the template. Clicking an item on the paper still opens that
 * item's own settings, like before.
 */
export function ContentPanel(): JSX.Element {
  const viewport = useViewport();
  const block = useAppSelector((s) => s.app.selectedBlock);
  const sections = useAppSelector(sectionsSelector);
  const hidden = useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const dispatch = useAppDispatch();
  const isDemo = useAppSelector((s) => s.persistence.status === "demo");
  const jobs = useAppSelector(jobsSelector);
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const isPlaceholder = useAppSelector(isPlaceholderSelector);
  const job = isPlaceholder
    ? undefined
    : jobs.find((entry) => entry.id === activeJobId);
  const [sectionMenu, setSectionMenu] = useState<HTMLElement | null>(null);
  const [statusMenu, setStatusMenu] = useState<HTMLElement | null>(null);
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
    <ResizableAside
      side="right"
      label="the content panel"
      defaultWidth={viewport === "desktop" ? 480 : 320}
      stackBelow="md"
      stackedHeight={{ xs: "34vh", sm: "38vh" }}
    >
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
          "& .MuiButton-root": { minHeight: { xs: 44, md: "auto" } },
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, flex: { xs: "1 1 140px", lg: 1 } }}>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                Section {index + 1} of {steps.length}
              </Typography>
              <Button
                color="neutral"
                aria-label="Go to section"
                aria-haspopup="menu"
                onClick={(event) => setSectionMenu(event.currentTarget)}
                endIcon={<KeyboardArrowDownIcon />}
                sx={{
                  mt: 0.25,
                  ml: -1,
                  px: 1,
                  py: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  textTransform: "none",
                  maxWidth: "100%",
                  whiteSpace: "nowrap",
                  justifyContent: "flex-start",
                  "& .MuiButton-endIcon": { color: WORKSPACE_COLORS.muted },
                }}
              >
                <Box component="span" sx={{ overflow: "hidden" }}>
                  {current.label}
                </Box>
              </Button>
              <Menu
                anchorEl={sectionMenu}
                open={Boolean(sectionMenu)}
                onClose={() => setSectionMenu(null)}
                slotProps={{ paper: { sx: { minWidth: 280 } } }}
              >
                {steps.map((entry, position) => (
                  <MenuItem
                    key={entry.id}
                    selected={entry.id === current.id}
                    onClick={() => {
                      setStep(entry.id);
                      setSectionMenu(null);
                    }}
                    sx={{ gap: 1.5 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        flex: "none",
                        ...(entry.id === current.id
                          ? {
                              bgcolor: WORKSPACE_COLORS.accent,
                              color: "#fff",
                            }
                          : {
                              border: `1px solid ${WORKSPACE_COLORS.border}`,
                              color: WORKSPACE_COLORS.muted,
                            }),
                      }}
                    >
                      {position + 1}
                    </Box>
                    <Box component="span" sx={{ flex: 1 }}>
                      {entry.label}
                    </Box>
                    {entry.id === current.id && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                      >
                        Here
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flex: "none" }}>
              <Button
                size="small"
                variant="outlined"
                disabled={!job}
                aria-haspopup="menu"
                aria-label="Job status"
                onClick={(event) => setStatusMenu(event.currentTarget)}
                startIcon={
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: job?.stage === "ready" ? "#2e7d32" : "#b7791f",
                    }}
                  />
                }
                endIcon={<KeyboardArrowDownIcon />}
              >
                {job?.stage === "ready" ? "Ready" : "Draft"}
              </Button>
              <Menu
                anchorEl={statusMenu}
                open={Boolean(statusMenu)}
                onClose={() => setStatusMenu(null)}
              >
                {(["draft", "ready"] as const).map((stage) => (
                  <MenuItem
                    key={stage}
                    selected={(job?.stage ?? "draft") === stage}
                    onClick={() => {
                      if (job) {
                        dispatch(
                          setJobDetails({ id: job.id, details: { stage } })
                        );
                      }
                      setStatusMenu(null);
                    }}
                  >
                    {stage === "ready" ? "Ready to apply" : "Draft"}
                  </MenuItem>
                ))}
              </Menu>
              <Button
                size="small"
                variant="contained"
                disabled={!job || isDemo}
                title={isDemo ? "Not available in the demo" : undefined}
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={() => setIsExportOpen(true)}
              >
                Export PDF
              </Button>
            </Box>
          </Box>
          <Box
            role="img"
            aria-label={`Section ${index + 1} of ${steps.length}`}
            sx={{ display: "flex", gap: 0.5 }}
          >
            {steps.map((entry, position) => (
              <Box
                key={entry.id}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: "2px",
                  bgcolor:
                    position <= index
                      ? WORKSPACE_COLORS.accent
                      : WORKSPACE_COLORS.border,
                }}
              />
            ))}
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

        <Box
          component="footer"
          sx={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            disabled={index === 0}
            onClick={() => setStep(steps[index - 1].id)}
          >
            {index === 0 ? "Back" : `Back: ${steps[index - 1].label}`}
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={index === steps.length - 1}
            onClick={() => setStep(steps[index + 1].id)}
          >
            {index === steps.length - 1
              ? "Next"
              : `Next: ${steps[index + 1].label}`}
          </Button>
        </Box>
        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      </Box>
    </ResizableAside>
  );
}
