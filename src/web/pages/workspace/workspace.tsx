import { MouseEvent, useEffect, useRef, useState } from "react";
import { Box, Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { AiSetup } from "@pages/workspace/ai-setup";
import { VaultPage } from "@pages/workspace/vault-page";
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { useUndoShortcuts } from "@pages/workspace/use-undo-shortcuts";
import { useCanvasShortcuts } from "@pages/workspace/use-canvas-shortcuts";
import { ZoomControls, ZoomFrame } from "@pages/workspace/canvas-zoom";
import { Outline } from "@pages/workspace/outline";
import { ChatPanel } from "@pages/workspace/chat-panel";
import { BlockToolbar } from "@pages/workspace/block-toolbar";
import { Inspector } from "@pages/workspace/inspector";
import { ConnectionBanner, FirstRun } from "@pages/workspace/workspace-states";
import { JobSettingsPage } from "@pages/workspace/job-settings-page";
import { TemplatesPage } from "@pages/workspace/templates-page";
import { ToolRail } from "@pages/workspace/tool-rail";
import { TopBar } from "@pages/workspace/top-bar";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useSyncStructure } from "@hooks/use-sync-structure";
import { usePersistence } from "@hooks/use-persistence";
import { useSyncActiveJob } from "@hooks/use-sync-active-job";
import { useAppSelector } from "@store/store-helper";
import { NotFound } from "@pages/workspace/not-found";
import { onAppLinkClick } from "@hooks/navigation";
import { useRouteSync } from "@hooks/use-route-sync";
import { WorkspaceRoute, formatRoute } from "@shared/routing/routes";
import { UNSORTED_SECTION_ID } from "@shared/vault/unsorted";
import { jobsSelector, templatesSelector } from "@store/jobs/jobs-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * The editor (design B): top bar, tool rail, the CV on a canvas and an inspector that
 * follows what is clicked. Vault and Tailor open the existing pages in the same frame.
 */
export function Workspace({ route }: { route: WorkspaceRoute }): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const tool = route.kind;
  const jobs = useAppSelector(jobsSelector);
  const templates = useAppSelector(templatesSelector);
  const sections = useAppSelector(sectionsSelector);
  const activeJobName = useAppSelector(
    (s) => s.jobs.jobs.find((job) => job.id === s.jobs.activeJobId)?.name ?? ""
  );
  const isLoading = useAppSelector((s) => s.persistence.status === "loading");
  useRouteSync(route);
  const missing = missingThing(route, isLoading, jobs, sections, templates);
  useEffect(() => {
    document.title = `${missing ? "Not found" : titleOf(route, activeJobName)} · CV Builder`;
  }, [route, activeJobName, missing]);
  const zoom = useAppSelector((s) => s.app.canvasZoom);
  useCanvasShortcuts(tool === "jobs");
  useUndoShortcuts();
  const jobsView = route.kind === "jobs" ? route.view : "page";
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
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
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />
      <ConnectionBanner />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ToolRail />
        {missing && <NotFound what={missing.what} backTo={missing.backTo} />}
        {!missing && tool === "jobs" && (
          <Box
            sx={{
              flex: "none",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
              bgcolor: WORKSPACE_COLORS.panel,
              p: 0.75,
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              orientation="vertical"
              aria-label="Job view"
              value={jobsView}
            >
              {(["page", "settings"] as const).map((view) => {
                const target = {
                  kind: "jobs" as const,
                  jobId: activeJobId,
                  view,
                };
                return (
                  <ToggleButton
                    key={view}
                    value={view}
                    component="a"
                    href={formatRoute(target)}
                    onClick={(event: MouseEvent<HTMLElement>) =>
                      onAppLinkClick(event, target)
                    }
                  >
                    {view === "page" ? "CV page" : "Job settings"}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>
        )}
        {!missing && tool === "jobs" && jobsView === "settings" && (
          <JobSettingsPage />
        )}
        {!missing &&
          ((tool === "jobs" && jobsView === "page") || tool === "chat") && (
            <>
              {isOutlineOpen && (
                <Outline onClose={() => setIsOutlineOpen(false)} />
              )}
              <Box
                component="main"
                aria-label="Canvas"
                ref={canvasRef}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "auto",
                  bgcolor: WORKSPACE_COLORS.canvas,
                  py: 3,
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <FirstRun />
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setIsOutlineOpen((wasOpen) => !wasOpen)}
                  sx={{ position: "absolute", left: 12, top: 12, zIndex: 3 }}
                >
                  {isOutlineOpen ? "Hide outline" : "Outline (O)"}
                </Button>
                <ZoomControls
                  getCanvasWidth={() => canvasRef.current?.clientWidth ?? 0}
                />
                <ZoomFrame zoom={zoom}>
                  <PreviewPage contentRef={contentRef} />
                </ZoomFrame>
                <BlockToolbar canvasRef={canvasRef} />
              </Box>
              {tool === "chat" ? <ChatPanel /> : <Inspector />}
            </>
          )}
        {!missing && tool === "templates" && <TemplatesPage />}
        {!missing && tool === "vault" && <VaultPage />}
        {!missing && tool === "tailor" && <AiAssistant />}
        {!missing && tool === "ai" && <AiSetup />}
      </Box>
    </Box>
  );
}

interface Missing {
  what: string;
  backTo: { href: string; label: string };
}

/** What the address names that does not exist (only once the data has loaded), if anything */
function missingThing(
  route: WorkspaceRoute,
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
function titleOf(route: WorkspaceRoute, jobName: string): string {
  switch (route.kind) {
    case "vault":
      return "Vault";
    case "jobs":
      return `${route.view === "settings" ? "Job settings" : "Jobs"}${jobName ? ` · ${jobName}` : ""}`;
    case "templates":
      return `Templates${route.tab === "templates" ? "" : ` · ${route.tab === "layout" ? "Page layout" : "Style settings"}`}`;
    case "tailor":
      return "Tailor";
    case "chat":
      return `Chat${jobName ? ` · ${jobName}` : ""}`;
    case "ai":
      return "AI setup";
  }
}
