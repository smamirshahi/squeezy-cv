import { MouseEvent, useEffect, useRef } from "react";
import { Box, Chip, Divider, Typography } from "@components/ui";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { onAppLinkClick, useRoute } from "@hooks/navigation";
import { useViewport } from "@hooks/use-viewport";
import { AiIcon } from "@components/ai-button";
import { PAGE_RING_SIZE, sinceText } from "@pages/workspace/ats/ats-panel";
import { ScoreRing } from "@pages/workspace/ats/score-ring";
import { useAts } from "@pages/workspace/ats/use-ats";
import { Route, formatRoute } from "@shared/routing/routes";

interface Entry {
  id: string;
  label: string;
  hint: string;
  to: (jobId?: string) => Route;
  isOn: (route: Route) => boolean;

  /** Needs a job application to work on */
  needsJob?: boolean;

  /** Uses AI: shown with the AI icon and colour */
  isAi?: boolean;
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
    isAi: true,
  },
];

/** 44 px touch targets in the tab strip */
const TOUCH_TARGET = 44;

/** In the tab strip the hint lines only fit from a tablet up */
const hintDisplay = { xs: "none", sm: "block" };

function Group({
  title,
  entries,
  jobId,
  hasJob,
  isStrip,
  children,
}: {
  children?: JSX.Element;
  title?: string;
  entries: Entry[];
  jobId?: string;
  hasJob: boolean;

  /** A row of tabs (below a desktop) instead of a column */
  isStrip: boolean;
}): JSX.Element {
  const route = useRoute();
  return (
    <Box
      sx={
        isStrip
          ? { display: "flex", gap: 0.5, flex: "none" }
          : { display: "grid", gap: 0.25 }
      }
    >
      {title && !isStrip && (
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
                minHeight: isStrip ? TOUCH_TARGET : undefined,
                flex: isStrip ? "none" : undefined,
                opacity: 0.45,
                cursor: "not-allowed",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {entry.label}
              </Typography>
              <Typography
                sx={{ fontSize: 12, display: isStrip ? hintDisplay : "block" }}
                noWrap
              >
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
              minHeight: isStrip ? TOUCH_TARGET : undefined,
              flex: isStrip ? "none" : undefined,
              whiteSpace: isStrip ? "nowrap" : undefined,
              borderRadius: 1,
              textDecoration: "none",
              color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
              bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
              "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                color: entry.isAi ? WORKSPACE_COLORS.aiText : undefined,
              }}
            >
              {entry.isAi && <AiIcon fontSize="inherit" />}
              {entry.label}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: WORKSPACE_COLORS.muted,
                display: isStrip ? hintDisplay : "block",
              }}
              noWrap
            >
              {entry.hint}
            </Typography>
          </Box>
        );
      })}
      {children}
    </Box>
  );
}

/**
 * "ATS score": the entry that opens the ATS page (a tab in the strip below a desktop, a button
 * under Chat in the desktop menu). Needs a job. In the strip it shows the latest score as a
 * number, never colour alone; on a desktop the summary below the menu shows it.
 */
function AtsTab({
  jobId,
  isScoreShown,
}: {
  jobId?: string;
  isScoreShown: boolean;
}): JSX.Element {
  const route = useRoute();
  const ats = useAts();
  const target: Route = { kind: "jobs", jobId, view: "ats" };
  const isOn = route.kind === "jobs" && route.view === "ats";
  const linkRef = useRef<HTMLElement>(null);
  // On a phone the strip scrolls: bring the open tab into view
  useEffect(() => {
    if (isOn) {
      linkRef.current?.scrollIntoView?.({
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [isOn]);
  if (jobId === undefined) {
    return (
      <Box
        aria-disabled="true"
        title="Start a job application first"
        sx={{
          px: 1.25,
          py: 0.9,
          minHeight: TOUCH_TARGET,
          flex: "none",
          opacity: 0.45,
          cursor: "not-allowed",
          color: WORKSPACE_COLORS.muted,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
          ATS score
        </Typography>
        <Typography sx={{ fontSize: 12, display: hintDisplay }} noWrap>
          Start a job application first
        </Typography>
      </Box>
    );
  }
  return (
    <Box
      component="a"
      ref={linkRef}
      href={formatRoute(target)}
      aria-current={isOn ? "page" : undefined}
      onClick={(event: MouseEvent<HTMLElement>) =>
        onAppLinkClick(event, target)
      }
      sx={{
        display: "block",
        px: 1.25,
        py: 0.9,
        minHeight: TOUCH_TARGET,
        flex: "none",
        whiteSpace: "nowrap",
        borderRadius: 1,
        textDecoration: "none",
        color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
        bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
        "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
      }}
    >
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: WORKSPACE_COLORS.aiText,
        }}
      >
        <AiIcon fontSize="inherit" />
        ATS score
        {isScoreShown && ats.now && (
          <Chip
            size="small"
            label={ats.now.total}
            aria-label={`score ${ats.now.total}`}
            sx={{ height: 20, fontSize: 12, fontWeight: 700 }}
          />
        )}
      </Typography>
      <Typography
        sx={{
          fontSize: 12,
          color: WORKSPACE_COLORS.muted,
          display: hintDisplay,
        }}
        noWrap
      >
        How a parser reads the CV
      </Typography>
    </Box>
  );
}

/** The general number under the desktop menu; the details are on the ATS page */
function AtsSummary(): JSX.Element | null {
  const ats = useAts();
  if (!ats.hasJob) {
    return null;
  }
  const total = ats.now?.total ?? null;
  let status = "Up to date";
  if (ats.isStale) {
    status = "CV changed";
  } else if (total === null) {
    status = "Not scanned yet";
  }
  return (
    <Box
      component="section"
      aria-label="ATS score summary"
      sx={{
        display: "grid",
        justifyItems: "center",
        textAlign: "center",
        gap: 1,
        p: 1.5,
      }}
    >
      <ScoreRing
        score={total}
        firstScore={ats.first?.total ?? null}
        size={PAGE_RING_SIZE}
        label={
          total === null
            ? "ATS score: not analysed yet"
            : `ATS score ${total} out of 100`
        }
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{status}</Typography>
        {ats.now && (
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            Analysed {sinceText(ats.now.at)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/**
 * The menu of the Apply tool: the pages of one job application. A resizable left panel on a
 * desktop; a horizontal tab strip above the page below that (scrolls inside itself on a phone).
 */
export function ApplySidebar({ jobId }: { jobId?: string }): JSX.Element {
  const isStrip = useViewport() !== "desktop";
  const groups = (
    <>
      <Group
        entries={MAIN}
        jobId={jobId}
        hasJob={jobId !== undefined}
        isStrip={isStrip}
      />
      <Group
        title="Assistants"
        entries={ASSISTANTS}
        jobId={jobId}
        hasJob={jobId !== undefined}
        isStrip={isStrip}
      >
        {isStrip ? undefined : <AtsTab jobId={jobId} isScoreShown={false} />}
      </Group>
    </>
  );
  if (isStrip) {
    return (
      <Box
        component="nav"
        aria-label="Job application"
        sx={{
          flex: "none",
          display: "flex",
          gap: 0.5,
          overflowX: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 1,
        }}
      >
        {groups}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <AtsTab jobId={jobId} isScoreShown />
      </Box>
    );
  }
  return (
    <ResizableAside side="left" label="the job menu" defaultWidth={272}>
      <Box
        sx={{
          width: "100%",
          flex: "none",
          overflow: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Box component="nav" aria-label="Job application" sx={{ p: 1 }}>
          {groups}
        </Box>
        <Divider />
        <AtsSummary />
      </Box>
    </ResizableAside>
  );
}
