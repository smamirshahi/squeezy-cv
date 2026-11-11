import { useEffect, useState } from "react";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { JobContent } from "@pages/editor-page/sections/job-content";
import { GeneralStep } from "@pages/workspace/general-step";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { Inspector } from "@pages/workspace/inspector";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { OPEN_GENERAL_EVENT } from "@pages/workspace/general-settings-event";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";
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
  const block = useAppSelector((s) => s.app.selectedBlock);
  const sections = useAppSelector(sectionsSelector);
  const hidden = useAppSelector(activeVariantSelector).hiddenSections ?? [];
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                Step {index + 1} of {steps.length}
              </Typography>
              <Typography
                component="h1"
                sx={{ fontSize: 18, fontWeight: 600, mt: 0.25 }}
              >
                {current.label}
              </Typography>
            </Box>
            <Select
              size="small"
              value={current.id}
              inputProps={{ "aria-label": "Go to step" }}
              sx={{ minWidth: 150, maxWidth: 220 }}
              onChange={(event) => setStep(event.target.value)}
            >
              {steps.map((entry) => (
                <MenuItem key={entry.id} value={entry.id}>
                  {entry.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box
            role="img"
            aria-label={`Step ${index + 1} of ${steps.length}`}
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
              {current.id !== HEADER_STEP && (
                <SectionTailor sectionId={current.id} />
              )}
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
      </Box>
    </ResizableAside>
  );
}
