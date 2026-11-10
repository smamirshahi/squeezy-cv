import { MouseEvent } from "react";
import { Box, Typography } from "@mui/material";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { onAppLinkClick, useRoute } from "@hooks/navigation";
import { Route, formatRoute } from "@shared/routing/routes";

interface Entry {
  id: string;
  label: string;
  hint: string;
  to: (jobId?: string) => Route;
  isOn: (route: Route) => boolean;

  /** Needs a job application to work on */
  needsJob?: boolean;
}

const MAIN: Entry[] = [
  {
    id: "details",
    label: "Job application",
    hint: "Company, role, link and advert",
    to: (jobId) => ({ kind: "jobs", jobId, view: "details" }),
    isOn: (r) => r.kind === "jobs" && r.view === "details",
  },
  {
    id: "template",
    label: "Template & content",
    hint: "Pick a look, then go section by section",
    to: (jobId) => ({ kind: "jobs", jobId, view: "page" }),
    isOn: (r) =>
      r.kind === "jobs" && (r.view === "page" || r.view === "settings"),
    needsJob: true,
  },
];

const ASSISTANTS: Entry[] = [
  {
    id: "chat",
    label: "Chat",
    hint: "Ask for changes in words",
    to: (jobId) => ({ kind: "chat", jobId }),
    isOn: (r) => r.kind === "chat",
    needsJob: true,
  },
];

function Group({
  title,
  entries,
  jobId,
  hasJob,
}: {
  title?: string;
  entries: Entry[];
  jobId?: string;
  hasJob: boolean;
}): JSX.Element {
  const route = useRoute();
  return (
    <Box sx={{ display: "grid", gap: 0.25 }}>
      {title && (
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            color: WORKSPACE_COLORS.muted,
            px: 1.25,
            pt: 1.5,
            pb: 0.5,
          }}
        >
          {title}
        </Typography>
      )}
      {entries.map((entry) => {
        const target = entry.to(jobId);
        const isOn = entry.isOn(route);
        if (entry.needsJob && !hasJob) {
          return (
            <Box
              key={entry.id}
              aria-disabled="true"
              title="Start a job application first"
              sx={{
                px: 1.25,
                py: 0.9,
                opacity: 0.45,
                cursor: "not-allowed",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {entry.label}
              </Typography>
              <Typography sx={{ fontSize: 12 }} noWrap>
                Start a job application first
              </Typography>
            </Box>
          );
        }
        return (
          <Box
            key={entry.id}
            component="a"
            href={formatRoute(target)}
            aria-current={isOn ? "page" : undefined}
            onClick={(event: MouseEvent<HTMLElement>) =>
              onAppLinkClick(event, target)
            }
            sx={{
              display: "block",
              px: 1.25,
              py: 0.9,
              borderRadius: 1,
              textDecoration: "none",
              color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
              bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
              "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              {entry.label}
            </Typography>
            <Typography
              sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
              noWrap
            >
              {entry.hint}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/** The left sidebar of the Apply tool: the pages of one job application */
export function ApplySidebar({ jobId }: { jobId?: string }): JSX.Element {
  return (
    <ResizableAside side="left" label="the job menu" defaultWidth={210}>
      <Box
        component="nav"
        aria-label="Job application"
        sx={{
          width: "100%",
          flex: "none",
          overflow: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 1,
        }}
      >
        <Group entries={MAIN} jobId={jobId} hasJob={jobId !== undefined} />
        <Group
          title="Assistants"
          entries={ASSISTANTS}
          jobId={jobId}
          hasJob={jobId !== undefined}
        />
      </Box>
    </ResizableAside>
  );
}
