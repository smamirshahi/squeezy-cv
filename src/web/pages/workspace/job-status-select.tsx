import { useState } from "react";
import { Box, ButtonBase, Menu, MenuItem, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** What the dropdown offers. "applied" is not stored on the job: it opens Mark as applied. */
export type JobStatus = "draft" | "ready" | "applied";

interface Option {
  value: JobStatus;
  label: string;
  help: string;
  dot: string;
}

const OPTIONS: Option[] = [
  {
    value: "draft",
    label: "Draft",
    help: "Still working on it.",
    dot: "var(--ib)",
  },
  {
    value: "ready",
    label: "Ready to apply",
    help: "The CV is finished but not sent.",
    dot: WORKSPACE_COLORS.accent,
  },
  {
    value: "applied",
    label: "Applied",
    help: "Freezes the CV and PDF you send, then opens Mark as applied.",
    dot: "var(--ok)",
  },
];

/** The one line of help under the closed dropdown */
export const STATUS_HELP: Record<JobStatus, string> = {
  draft: "Still working on it. Change it when the CV is finished.",
  ready: "The CV is finished but not sent yet.",
  applied: "Sent. Freezes the CV and PDF.",
};

function Dot({ color }: { color: string }): JSX.Element {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        flex: "none",
        bgcolor: color,
      }}
    />
  );
}

/**
 * Status of the job as one dropdown with a line of help per choice. Draft and Ready to apply are
 * the stage of the job; Applied hands over to Mark as applied (the application keeps the later
 * steps: interview, offer and the rest).
 */
export function JobStatusSelect({
  value,
  isDisabled,
  onChange,
}: {
  value: JobStatus;
  isDisabled?: boolean;
  onChange: (status: JobStatus) => void;
}): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current =
    OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];
  return (
    <>
      <ButtonBase
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={anchor !== null}
        aria-label={`Status: ${current.label}`}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
          height: { xs: 48, lg: 40 },
          px: 1.25,
          border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          borderColor: "var(--ib)",
          borderRadius: "4px",
          bgcolor: WORKSPACE_COLORS.panel,
          fontWeight: 500,
          textAlign: "left",
          justifyContent: "flex-start",
        }}
      >
        <Dot color={current.dot} />
        <Box component="span" sx={{ flex: 1 }}>
          {current.label}
        </Box>
        <ExpandMoreIcon fontSize="small" />
      </ButtonBase>
      <Menu
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        slotProps={{
          list: { role: "listbox", "aria-label": "Status" },
          paper: { sx: { width: anchor?.clientWidth, maxWidth: "92vw" } },
        }}
      >
        {OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            selected={option.value === value}
            onClick={() => {
              setAnchor(null);
              onChange(option.value);
            }}
            sx={{ gap: 1.25, alignItems: "center", whiteSpace: "normal" }}
          >
            <Dot color={option.dot} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {option.label}
              </Typography>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                {option.help}
              </Typography>
            </Box>
            {option.value === value && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </MenuItem>
        ))}
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: WORKSPACE_COLORS.panelAlt,
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
          }}
        >
          Interview, offer and the rest are set on the application, after you
          apply.
        </Box>
      </Menu>
    </>
  );
}
