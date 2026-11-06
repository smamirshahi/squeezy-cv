import { Box, ButtonBase, Typography } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LayersIcon from "@mui/icons-material/Layers";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import MemoryIcon from "@mui/icons-material/Memory";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { WorkspaceTool, setTool } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useThemeMode } from "@custom-styles/theme";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

interface RailItem {
  label: string;
  icon: JSX.Element;
  tool?: WorkspaceTool;
  href?: string;
}

const ITEMS: RailItem[] = [
  { label: "Vault", icon: <FolderOpenIcon fontSize="small" />, tool: "vault" },
  {
    label: "Variants",
    icon: <LayersIcon fontSize="small" />,
    tool: "variants",
  },
  {
    label: "Tailor",
    icon: <AutoAwesomeIcon fontSize="small" />,
    tool: "tailor",
  },
  {
    label: "Applied",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
    href: "/?applications",
  },
];

const SETTINGS: RailItem = {
  label: "AI setup",
  icon: <MemoryIcon fontSize="small" />,
  tool: "ai",
};

/** The left rail: switches between the tools of the workspace */
export function ToolRail(): JSX.Element {
  const dispatch = useAppDispatch();
  const tool = useAppSelector((s) => s.app.tool);
  const { mode, toggle } = useThemeMode();

  return (
    <Box
      component="nav"
      aria-label="Tools"
      sx={{
        width: 56,
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
      {[...ITEMS, null, SETTINGS, "theme" as const].map((item) => {
        if (item === null) {
          return <Box key="spacer" sx={{ flex: 1 }} />;
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
                width: 44,
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
        const isOn = item.tool === tool;
        return (
          <ButtonBase
            key={item.label}
            component={item.href ? "a" : "button"}
            href={item.href}
            aria-current={isOn ? "page" : undefined}
            onClick={
              item.tool
                ? () => dispatch(setTool(item.tool as WorkspaceTool))
                : undefined
            }
            sx={{
              width: 44,
              py: 0.9,
              borderRadius: 1,
              flexDirection: "column",
              gap: 0.25,
              color: isOn
                ? WORKSPACE_COLORS.accentText
                : WORKSPACE_COLORS.muted,
              bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
              "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
            }}
          >
            {item.icon}
            <Typography sx={{ fontSize: 10.5 }}>{item.label}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
