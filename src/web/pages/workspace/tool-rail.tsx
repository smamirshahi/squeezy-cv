import { MouseEvent, useState } from "react";
import { Box, ButtonBase, Tooltip, Typography } from "@components/ui";
import {
  BackupOutlined as BackupOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  FolderOpenOutlined as FolderOpenIcon,
  GitHub as GitHubIcon,
  InfoOutlined as InfoOutlinedIcon,
  LayersOutlined as LayersIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  MemoryOutlined as MemoryIcon,
  WorkOutlineOutlined as WorkOutlineIcon,
} from "@components/ui/icons";
import { onAppLinkClick, useRoute } from "@hooks/navigation";
import { Route, formatRoute } from "@shared/routing/routes";
import { useAppSelector } from "@store/store-helper";
import { useThemeMode } from "@custom-styles/theme";
import { APP_VERSION } from "@shared/version";
import { COMMIT_TOOLTIP } from "@hooks/build-info";
import { ABOUT, AboutDialog } from "@pages/workspace/about-dialog";
import { openDataDialog } from "@pages/workspace/data-dialog";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useViewport } from "@hooks/use-viewport";

interface RailItem {
  label: string;
  icon: JSX.Element;

  /** The route this item opens; `jobId` is the active job for the tools that work on one */
  to: (jobId: string) => Route | null;

  /** Which route kind makes it the current one */
  kind: Route["kind"];
}

const ITEMS: RailItem[] = [
  {
    label: "Vault",
    icon: <FolderOpenIcon fontSize="small" />,
    kind: "vault",
    to: () => ({ kind: "vault" }),
  },
  {
    label: "Templates",
    icon: <LayersIcon fontSize="small" />,
    kind: "templates",
    to: () => ({ kind: "templates", tab: "templates" }),
  },
  {
    label: "Apply",
    icon: <WorkOutlineIcon fontSize="small" />,
    kind: "jobs",
    to: (jobId) => ({ kind: "jobs", jobId, view: "details" }),
  },
  {
    label: "Applications",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
    kind: "applications",
    to: () => ({ kind: "applications", search: "" }),
  },
];

/** The left rail: switches between the tools of the workspace */
export function ToolRail(): JSX.Element {
  const route = useRoute();
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const { mode, toggle } = useThemeMode();
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  // On a phone the rail is a bottom tab bar with the four tools; the rest is in the top bar's menu
  const isPhone = useViewport() === "phone";

  return (
    <Box
      component="nav"
      aria-label="Tools"
      sx={{
        width: { xs: "100%", sm: 72 },
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: { xs: "none", sm: `1px solid ${WORKSPACE_COLORS.border}` },
        borderTop: { xs: `1px solid ${WORKSPACE_COLORS.border}`, sm: "none" },
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        alignItems: "center",
        pt: { xs: 0.5, sm: 1 },
        pb: { xs: "calc(4px + env(safe-area-inset-bottom))", sm: 1 },
        px: { xs: 0.5, sm: 0 },
        gap: 0.25,
      }}
    >
      {(isPhone
        ? ITEMS
        : [
            ...ITEMS,
            null,
            "about" as const,
            "github" as const,
            "data" as const,
            "settings" as const,
            "theme" as const,
          ]
      ).map((item) => {
        if (item === null) {
          return <Box key="spacer" sx={{ flex: 1 }} />;
        }
        if (item === "about") {
          return (
            <ButtonBase
              key="about"
              onClick={() => setIsAboutOpen(true)}
              aria-haspopup="dialog"
              aria-label="About Squeezy CV and its author"
              sx={{
                width: 60,
                py: 0.9,
                borderRadius: 1,
                flexDirection: "column",
                gap: 0.25,
                color: WORKSPACE_COLORS.muted,
                "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
              <Typography sx={{ fontSize: 10.5 }}>About</Typography>
            </ButtonBase>
          );
        }
        if (item === "github") {
          return (
            <ButtonBase
              key="github"
              component="a"
              href={ABOUT.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Squeezy CV on GitHub (opens in a new tab)"
              sx={{
                width: 60,
                py: 0.9,
                borderRadius: 1,
                flexDirection: "column",
                gap: 0.25,
                color: WORKSPACE_COLORS.muted,
                "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
              }}
            >
              <GitHubIcon fontSize="small" />
              <Typography sx={{ fontSize: 10.5 }}>GitHub</Typography>
            </ButtonBase>
          );
        }
        if (item === "data") {
          return (
            <ButtonBase
              key="data"
              onClick={openDataDialog}
              aria-haspopup="dialog"
              aria-label="Your data: backup and restore"
              sx={{
                width: 60,
                py: 0.9,
                borderRadius: 1,
                flexDirection: "column",
                gap: 0.25,
                color: WORKSPACE_COLORS.muted,
                "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
              }}
            >
              <BackupOutlinedIcon fontSize="small" />
              <Typography sx={{ fontSize: 10.5 }}>Data</Typography>
            </ButtonBase>
          );
        }
        if (item === "settings") {
          return (
            <ButtonBase
              key="settings"
              onClick={() => openAiSettings()}
              aria-haspopup="dialog"
              aria-label="Settings"
              sx={{
                width: 60,
                py: 0.9,
                borderRadius: 1,
                flexDirection: "column",
                gap: 0.25,
                color: WORKSPACE_COLORS.muted,
                "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
              }}
            >
              <MemoryIcon fontSize="small" />
              <Typography sx={{ fontSize: 10.5 }}>Settings</Typography>
            </ButtonBase>
          );
        }
        if (item === "theme") {
          return (
            <ButtonBase
              key="theme"
              onClick={toggle}
              aria-label={
                mode === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              sx={{
                width: 60,
                py: 0.9,
                borderRadius: 1,
                flexDirection: "column",
                gap: 0.25,
                color: WORKSPACE_COLORS.muted,
                "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
              }}
            >
              {mode === "dark" ? (
                <LightModeOutlinedIcon fontSize="small" />
              ) : (
                <DarkModeOutlinedIcon fontSize="small" />
              )}
              <Typography sx={{ fontSize: 10.5 }}>
                {mode === "dark" ? "Light" : "Dark"}
              </Typography>
            </ButtonBase>
          );
        }
        const target = item.to(activeJobId);
        const href = target ? formatRoute(target) : undefined;
        const isOn =
          item.kind === route.kind ||
          (item.kind === "jobs" && route.kind === "chat");
        return (
          <ButtonBase
            key={item.label}
            component="a"
            href={href}
            aria-current={isOn ? "page" : undefined}
            onClick={
              target
                ? (event: MouseEvent<HTMLElement>) =>
                    onAppLinkClick(event, target)
                : undefined
            }
            sx={{
              width: { xs: "auto", sm: 60 },
              flex: { xs: 1, sm: "none" },
              minWidth: 0,
              minHeight: { xs: 48, sm: 0 },
              py: 0.9,
              borderRadius: 1,
              flexDirection: "column",
              gap: 0.25,
              color: isOn
                ? WORKSPACE_COLORS.accentText
                : WORKSPACE_COLORS.muted,
              bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
              "&:hover": {
                bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover,
              },
            }}
          >
            {item.icon}
            <Typography sx={{ fontSize: 10.5 }}>{item.label}</Typography>
          </ButtonBase>
        );
      })}
      {!isPhone && (
        <Tooltip title={COMMIT_TOOLTIP}>
          <Typography
            aria-label={`Version ${APP_VERSION}`}
            sx={{ fontSize: 10, color: WORKSPACE_COLORS.muted, pt: 0.5 }}
          >
            v{APP_VERSION}
          </Typography>
        </Tooltip>
      )}
      {!isPhone && (
        <AboutDialog
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      )}
    </Box>
  );
}
