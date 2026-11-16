import { RefObject, useEffect, useRef, useState } from "react";
import { Box, Button } from "@components/ui";
import { navigate } from "@hooks/navigation";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import { VaultPage } from "@pages/workspace/vault-page";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { useUndoShortcuts } from "@pages/workspace/use-undo-shortcuts";
import { useCanvasShortcuts } from "@pages/workspace/use-canvas-shortcuts";
import {
  FitWidthOnFirstView,
  ZoomControls,
  ZoomFrame,
} from "@pages/workspace/canvas-zoom";
import { Outline } from "@pages/workspace/outline";
import { ChatPanel } from "@pages/workspace/chat-panel";
import { BlockToolbar } from "@pages/workspace/block-toolbar";
import { ConnectionBanner, FirstRun } from "@pages/workspace/workspace-states";
import { JobSettingsPage } from "@pages/workspace/job-settings-page";
import { TemplatesPage } from "@pages/workspace/templates-page";
import { ToolRail } from "@pages/workspace/tool-rail";
import { TopBar } from "@pages/workspace/top-bar";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useSyncStructure } from "@hooks/use-sync-structure";
import { AtsPanel } from "@pages/workspace/ats/ats-panel";
import { usePersistence } from "@hooks/use-persistence";
import { useSyncActiveJob } from "@hooks/use-sync-active-job";
import { useAppSelector } from "@store/store-helper";
import { NotFound } from "@pages/workspace/not-found";
import { useRouteSync } from "@hooks/use-route-sync";
import { Route, ShellRoute } from "@shared/routing/routes";
import { UNSORTED_SECTION_ID } from "@shared/vault/unsorted";
import {
  isPlaceholderSelector,
  jobsSelector,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { JobDetailsPage } from "@pages/workspace/job-details-page";
import { ApplicationsPage } from "@pages/applications-page/applications-page";
import { ApplicationView } from "@pages/applications-page/application-view";
import { ContentPanel } from "@pages/workspace/content-panel";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { TemplateBar } from "@pages/workspace/template-bar";
import { ApplySidebar } from "@pages/workspace/apply-sidebar";
import { NoJobs } from "@pages/workspace/no-jobs";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * The editor (design B): top bar, tool rail, the CV on a canvas and an inspector that
 * follows what is clicked. Vault and Tailor open the existing pages in the same frame.
 */
export function Workspace({ route }: { route: ShellRoute }): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const tool = route.kind;
  const jobs = useAppSelector(jobsSelector);
  const templates = useAppSelector(templatesSelector);
  const sections = useAppSelector(sectionsSelector);
  const activeJobName = useAppSelector(
    (s) => s.jobs.jobs.find((job) => job.id === s.jobs.activeJobId)?.name ?? ""
  );
  const isPlaceholder = useAppSelector(isPlaceholderSelector);
  const isEmpty =
    isPlaceholder &&
    (tool === "chat" ||
      (tool === "jobs" && route.kind === "jobs" && route.view !== "details"));
  const isJobsWithoutJobs =
    isPlaceholder && route.kind === "jobs" && route.view === "details";
  const isLoading = useAppSelector((s) => s.persistence.status === "loading");
  const isApplyTool = tool === "jobs" || tool === "chat";
  useRouteSync(route);
  const missing = missingThing(route, isLoading, jobs, sections, templates);
  useEffect(() => {
    document.title = `${missing ? "Not found" : titleOf(route, activeJobName)} · Squeezy CV`;
  }, [route, activeJobName, missing]);
  const zoom = useAppSelector((s) => s.app.canvasZoom);
  useCanvasShortcuts(tool === "jobs");
  // The old Settings address (/settings) has no page any more: it opens the dialog and goes back
  useEffect(() => {
    if (tool === "ai") {
      openAiSettings();
      navigate({ kind: "jobs", view: "details" }, { replace: true });
    }
  }, [tool]);
  useUndoShortcuts();
  const requestedView = route.kind === "jobs" ? route.view : "page";
  const isAtsView = requestedView === "ats";
  const jobsView = requestedView;
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  const barRef = useRef<HTMLDivElement>(null);
  const barHeight = useElementHeight(barRef, isOutlineOpen);
  // "O" opens and closes the outline, unless the user is typing
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;
      if (
        event.key.toLowerCase() === "o" &&
        !isTyping &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        setIsOutlineOpen((wasOpen) => !wasOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useSyncStructure();
  useSyncActiveJob();
  usePersistence();

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        "@supports (height: 100dvh)": { height: "100dvh" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />
      <ConnectionBanner />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          // On a phone the rail (first in the DOM) is a bottom tab bar
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <ToolRail />
        <Box
          data-toast-area="page"
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            display: "flex",
            // Apply: the job menu is a tab strip above the page below a desktop; the other tools
            // keep one row
            flexDirection: isApplyTool ? { xs: "column", lg: "row" } : "row",
          }}
        >
          {missing && <NotFound what={missing.what} backTo={missing.backTo} />}
          {!missing && ["jobs", "chat"].includes(tool) && (
            <ApplySidebar jobId={isPlaceholder ? undefined : activeJobId} />
          )}
          {!missing &&
            tool === "jobs" &&
            (isJobsWithoutJobs || jobsView === "details") && <JobDetailsPage />}
          {!missing &&
            !isEmpty &&
            !isJobsWithoutJobs &&
            tool === "jobs" &&
            jobsView === "settings" && <JobSettingsPage />}
          {!missing &&
            !isEmpty &&
            !isJobsWithoutJobs &&
            ((tool === "jobs" && (jobsView === "page" || isAtsView)) ||
              tool === "chat") && (
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  // The panel goes under the canvas below a laptop
                  flexDirection: { xs: "column", md: "row" },
                  position: "relative",
                }}
              >
                {isOutlineOpen && (
                  <Box
                    sx={{
                      // Below a desktop the outline lies over the canvas, but under the template
                      // bar, so its "Hide outline" button stays reachable
                      display: { xs: "block", lg: "contents" },
                      position: { xs: "absolute", lg: "static" },
                      top: barHeight,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 6,
                      pointerEvents: { xs: "none", lg: "auto" },
                      "& > *": { pointerEvents: "auto" },
                    }}
                  >
                    <Outline onClose={() => setIsOutlineOpen(false)} />
                  </Box>
                )}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    // The ATS score fills a phone. The CV stays laid out (the page count it is
                    // scored on is measured from it) but takes no room
                    ...(isAtsView && {
                      height: { xs: 0, sm: "auto" },
                      flex: { xs: "none", sm: 1 },
                      overflow: { xs: "hidden", sm: "visible" },
                      visibility: { xs: "hidden", sm: "visible" },
                    }),
                  }}
                >
                  {tool === "jobs" && (
                    <Box ref={barRef} sx={{ flex: "none" }}>
                      <TemplateBar
                        isOutlineOpen={isOutlineOpen}
                        onToggleOutline={() =>
                          setIsOutlineOpen((wasOpen) => !wasOpen)
                        }
                      />
                    </Box>
                  )}
                  <Box
                    component="main"
                    aria-label="Canvas"
                    data-toast-area="canvas"
                    ref={canvasRef}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "auto",
                      bgcolor: WORKSPACE_COLORS.canvas,
                      py: 3,
                      display: "flex",
                      justifyContent: "safe center",
                      position: "relative",
                    }}
                  >
                    <FirstRun />
                    {tool === "chat" && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setIsOutlineOpen((wasOpen) => !wasOpen)}
                        sx={{
                          position: "absolute",
                          left: 12,
                          top: 12,
                          zIndex: 3,
                        }}
                      >
                        {isOutlineOpen ? "Hide outline" : "Outline (O)"}
                      </Button>
                    )}
                    <FitWidthOnFirstView canvasRef={canvasRef} />
                    <ZoomControls
                      getCanvasWidth={() => canvasRef.current?.clientWidth ?? 0}
                    />
                    <ZoomFrame zoom={zoom}>
                      <PreviewPage contentRef={contentRef} />
                    </ZoomFrame>
                    <BlockToolbar canvasRef={canvasRef} />
                  </Box>
                </Box>
                {tool === "chat" ? (
                  <ChatPanel />
                ) : isAtsView ? (
                  <AtsAside />
                ) : (
                  <ContentPanel />
                )}
              </Box>
            )}
          {!missing && tool === "templates" && <TemplatesPage />}
          {!missing && isEmpty && <NoJobs />}
          {!missing && tool === "vault" && <VaultPage />}
          {!missing && route.kind === "applications" && <ApplicationsPage />}
          {!missing && route.kind === "application" && (
            <Box sx={{ flex: 1, minWidth: 0, overflow: "auto" }}>
              <ApplicationView applicationId={route.id} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * The ATS score as a panel next to (laptop) or under (tablet, phone) the CV, below a desktop
 * where the sidebar has no room for it. Same sizes as the content panel it replaces.
 */
function AtsAside(): JSX.Element {
  return (
    <ResizableAside
      side="right"
      label="the ATS score"
      defaultWidth={320}
      stackBelow="md"
      stackedHeight={{ xs: "100%", sm: 500 }}
    >
      <Box
        component="aside"
        aria-label="ATS score"
        sx={{
          overflow: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: { md: `1px solid ${WORKSPACE_COLORS.border}` },
          borderTop: {
            xs: `1px solid ${WORKSPACE_COLORS.border}`,
            md: "none",
          },
        }}
      >
        <AtsPanel variant="page" />
      </Box>
    </ResizableAside>
  );
}

interface Missing {
  what: string;
  backTo: { href: string; label: string };
}

/** What the address names that does not exist (only once the data has loaded), if anything */
function missingThing(
  route: Route,
  isLoading: boolean,
  jobs: { id: string }[],
  sections: { id: string; items: { id: string }[] }[],
  templates: { id: string }[]
): Missing | null {
  if (isLoading) {
    return null;
  }
  if (
    route.kind === "templates" &&
    route.templateId !== undefined &&
    !templates.some((template) => template.id === route.templateId)
  ) {
    return {
      what: "template",
      backTo: { href: "/templates", label: "Back to the templates" },
    };
  }
  if (
    (route.kind === "jobs" || route.kind === "chat") &&
    route.jobId !== undefined &&
    !jobs.some((job) => job.id === route.jobId)
  ) {
    return {
      what: "job",
      backTo: { href: "/jobs", label: "Back to your jobs" },
    };
  }
  if (route.kind === "vault" && route.sectionId !== undefined) {
    const section = sections.find((entry) => entry.id === route.sectionId);
    const isKnownPage =
      route.sectionId === "mainInfo" ||
      route.sectionId === UNSORTED_SECTION_ID ||
      section !== undefined;
    const isKnownItem =
      route.itemId === undefined ||
      section?.items.some((item) => item.id === route.itemId) === true;
    if (!isKnownPage || !isKnownItem) {
      return {
        what: isKnownPage ? "item" : "section",
        backTo: { href: "/vault", label: "Back to the vault" },
      };
    }
  }
  return null;
}

/** The page title: the section (and the job, where there is one) */
function titleOf(route: ShellRoute, jobName: string): string {
  switch (route.kind) {
    case "vault":
      return "Vault";
    case "jobs":
      return `${titleOfJobsView(route.view)}${jobName ? ` · ${jobName}` : ""}`;
    case "templates":
      return `Templates${route.tab === "templates" ? "" : route.tab === "sections" ? " · Sections" : " · Design"}`;
    case "chat":
      return `Chat${jobName ? ` · ${jobName}` : ""}`;
    case "ai":
      return "Settings";
    case "applications":
    case "application":
      return "Applications";
  }
}

function titleOfJobsView(
  view: "page" | "settings" | "details" | "ats"
): string {
  switch (view) {
    case "settings":
      return "Content";
    case "details":
      return "Job application";
    case "ats":
      return "ATS score";
    case "page":
      return "Apply";
  }
}

/** The height of an element (0 while it is not drawn), followed while `isActive` */
function useElementHeight(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean
): number {
  const [height, setHeight] = useState<number>(0);
  useEffect(() => {
    const element = ref.current;
    if (!isActive || !element || typeof ResizeObserver === "undefined") {
      setHeight(0);
      return undefined;
    }
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    setHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, [ref, isActive]);
  return height;
}
