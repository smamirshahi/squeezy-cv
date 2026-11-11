import { MouseEvent } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LayersIcon from "@mui/icons-material/Layers";
import WorkOutlineIcon from "@mui/icons-material/WorkOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LocalCafeOutlinedIcon from "@mui/icons-material/LocalCafeOutlined";
import MemoryIcon from "@mui/icons-material/Memory";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { onAppLinkClick, useRoute } from "@hooks/navigation";
import { Route, formatRoute } from "@shared/routing/routes";
import { useAppSelector } from "@store/store-helper";
import { useThemeMode } from "@custom-styles/theme";
import { APP_VERSION } from "@shared/version";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

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

/** Where the "Buy me a coffee" button goes. */
const SUPPORT_URL = "https://ko-fi.com/mohammadamirshahi";

const SETTINGS: RailItem = {
  label: "Settings",
  icon: <MemoryIcon fontSize="small" />,
  kind: "ai",
  to: () => ({ kind: "ai" }),
};

/** The left rail: switches between the tools of the workspace */
export function ToolRail(): JSX.Element {
  const route = useRoute();
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const { mode, toggle } = useThemeMode();

  return (
    <Box
      component="nav"
      aria-label="Tools"
      sx={{
        width: 72,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        gap: 0.25,
      }}
    >
      {[...ITEMS, null, "coffee" as const, SETTINGS, "theme" as const].map(
        (item) => {
          if (item === null) {
            return <Box key="spacer" sx={{ flex: 1 }} />;
          }
          if (item === "coffee") {
            return (
              <ButtonBase
                key="coffee"
                component="a"
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy me a coffee (opens Ko-fi)"
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
                <LocalCafeOutlinedIcon fontSize="small" />
                <Typography sx={{ fontSize: 10.5 }}>Coffee</Typography>
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
                width: 60,
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
        }
      )}
      <Typography
        aria-label={`Version ${APP_VERSION}`}
        sx={{ fontSize: 10, color: WORKSPACE_COLORS.muted, pt: 0.5 }}
      >
        v{APP_VERSION}
      </Typography>
    </Box>
  );
}
