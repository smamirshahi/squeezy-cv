import { Box } from "@components/ui";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** The stage of a job that has not been sent yet. It is set on the CV page; Applied is not here. */
export type JobStatus = "draft" | "ready";

const OPTIONS: Record<JobStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "var(--ib)" },
  ready: { label: "Ready to apply", dot: WORKSPACE_COLORS.accent },
};

/** The one line of help under the status */
export const STATUS_HELP: Record<JobStatus, string> = {
  draft:
    "Still working on it. Mark it Ready on the CV page when the CV is done.",
  ready: "The CV is finished but not sent yet.",
};

/**
 * The stage of the job, shown but not changed here: nothing has been built yet on this page.
 * Sending is recorded at the end (export dialog) or with "I applied elsewhere".
 */
export function JobStatusChip({ value }: { value: JobStatus }): JSX.Element {
  const current = OPTIONS[value];
  return (
    <Box
      role="status"
      aria-label={`Status: ${current.label}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: "100%",
        height: { xs: 48, lg: 40 },
        px: 1.25,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: "4px",
        bgcolor: WORKSPACE_COLORS.panelAlt,
        fontWeight: 500,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          flex: "none",
          bgcolor: current.dot,
        }}
      />
      {current.label}
    </Box>
  );
}
