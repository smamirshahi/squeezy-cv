import { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Popover, Typography } from "@components/ui";
import {
  InfoOutlined as InfoOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  WorkOutlineOutlined as WorkOutlineOutlinedIcon,
} from "@components/ui/icons";
import {
  onAiSettingsChanged,
  openAiSettings,
} from "@pages/workspace/ai-settings-event";
import { AiTask } from "@shared/ai/providers";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { activeJobSelector } from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";
import { Job } from "@custom-types/job-types";

/** "Senior Frontend Developer · Acme": which job the AI works for (role and company, else the job name) */
export function jobLabelOf(job: Job): string {
  const parts = [job.role, job.company].filter(
    (part): part is string => (part ?? "").trim() !== ""
  );
  return parts.length > 0 ? parts.join(" · ") : job.name;
}

/** Number of requirements the job's advert gave (0 = no advert analysed yet) */
function requirementCount(job: Job): number {
  const analysis = job.analysis;
  return analysis ? analysis.mustHave.length + analysis.niceToHave.length : 0;
}

/** The provider chosen for AI wording and scoring, with whether it is online; null while unknown */
function useAiProvider(
  isEnabled = true
): ReturnType<typeof taskProvider> | null {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const load = (): void => {
      api
        .getAiStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    };
    load();
    return onAiSettingsChanged(load);
  }, [api, isEnabled]);
  return status ? taskProvider(status, "tailor") : null;
}

/**
 * The (i) button that says what the AI considers: this job and its requirements, the saved text of
 * the entry, what is never sent and where the result goes. One text for every AI group.
 */
export function AiInfoButton({
  hasEntry = false,
}: {
  hasEntry?: boolean;
}): JSX.Element {
  const job = useAppSelector(activeJobSelector);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The provider is only asked for when the popover is opened
  const ai = useAiProvider(anchor !== null);
  const count = requirementCount(job);
  const where = ai?.info
    ? ai.info.isOnline
      ? `Sent to ${ai.info.recipient} (online).`
      : "Stays on this computer (local model)."
    : "";
  return (
    <>
      <IconButton
        size="small"
        aria-label="What does AI consider?"
        color="secondary"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ p: 0.25 }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxWidth: "90vw",
              p: 1.5,
              display: "grid",
              gap: 0.75,
              border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
            },
          },
        }}
      >
        <Typography
          sx={{ fontSize: 13, fontWeight: 700, color: WORKSPACE_COLORS.aiText }}
        >
          What the AI considers
        </Typography>
        <Typography sx={{ fontSize: 12 }}>
          <b>This job:</b> {jobLabelOf(job)}
          {count > 0
            ? `, with the ${count} requirements from its advert.`
            : ", but no advert yet, so results will be generic."}
        </Typography>
        {hasEntry && (
          <Typography sx={{ fontSize: 12 }}>
            <b>This entry:</b> its saved description.
          </Typography>
        )}
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Never sent: your name or contact details. Employer and school names
          are masked. {where}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          The result is a proposal. Your vault text never changes.
        </Typography>
      </Popover>
    </>
  );
}

/** The chip with the job the AI works for, with its (i) */
export function AiJobChip(): JSX.Element {
  const job = useAppSelector(activeJobSelector);
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: 28,
        pl: 1.25,
        pr: 0.5,
        borderRadius: 14,
        bgcolor: WORKSPACE_COLORS.panel,
        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <WorkOutlineOutlinedIcon aria-hidden="true" sx={{ fontSize: 14 }} />
      {jobLabelOf(job)}
      <AiInfoButton />
    </Box>
  );
}

/** The gear that opens the AI settings dialog on the task of the action it sits next to */
export function AiSettingsButton({ task }: { task: AiTask }): JSX.Element {
  return (
    <IconButton
      size="small"
      aria-label="AI settings"
      aria-haspopup="dialog"
      color="secondary"
      onClick={() => openAiSettings(task)}
      sx={{ p: 0.25 }}
    >
      <SettingsOutlinedIcon fontSize="small" />
    </IconButton>
  );
}
