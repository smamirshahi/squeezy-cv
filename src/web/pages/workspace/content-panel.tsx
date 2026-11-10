import { useState } from "react";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { JobContent } from "@pages/editor-page/sections/job-content";
import { TailorAll } from "@pages/workspace/tailor-all";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { Inspector } from "@pages/workspace/inspector";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";

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
  const [step, setStep] = useState<string>(HEADER_STEP);
  const steps = [
    { id: HEADER_STEP, label: "Header and links" },
    ...sections
      .filter((section) => !hidden.includes(section.id))
      .map((section) => ({ id: section.id, label: section.title })),
  ];
  const found = steps.findIndex((entry) => entry.id === step);
  const index = found === -1 ? 0 : found;

  if (block) {
    return <Inspector />;
  }

  return (
    <ResizableAside side="right" label="the content panel" defaultWidth={560}>
      <Box
        component="aside"
        aria-label="Content"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          overflow: "auto",
          p: 2,
          display: "grid",
          gap: 1.5,
          alignContent: "start",
        }}
      >
        <TailorAll />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            disabled={index === 0}
            onClick={() => setStep(steps[index - 1].id)}
          >
            Back
          </Button>
          <Select
            size="small"
            fullWidth
            value={steps[index].id}
            aria-label="Section"
            onChange={(event) => setStep(event.target.value)}
          >
            {steps.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.label}
              </MenuItem>
            ))}
          </Select>
          <Button
            size="small"
            variant="contained"
            disabled={index === steps.length - 1}
            onClick={() => setStep(steps[index + 1].id)}
          >
            Next
          </Button>
        </Box>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Step {index + 1} of {steps.length}
        </Typography>
        {steps[index].id !== HEADER_STEP && (
          <SectionTailor sectionId={steps[index].id} />
        )}
        <JobContent only={steps[index].id} />
      </Box>
    </ResizableAside>
  );
}
