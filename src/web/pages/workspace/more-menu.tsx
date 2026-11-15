import { useState } from "react";
import {
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  BackupOutlined as BackupOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  MemoryOutlined as MemoryIcon,
  MoreVertOutlined as MoreVertIcon,
} from "@components/ui/icons";
import { useThemeMode } from "@custom-styles/theme";
import { APP_VERSION } from "@shared/version";
import { COMMIT_TOOLTIP } from "@hooks/build-info";
import { AboutDialog } from "@pages/workspace/about-dialog";
import { openDataDialog } from "@pages/workspace/data-dialog";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/**
 * Phone only: About, Settings, the theme switch and the version, which sit in the tool rail on
 * larger screens. The rail on a phone is a bottom tab bar with room for the four tools only.
 */
export function MoreMenu(): JSX.Element {
  const { mode, toggle } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  function close(): void {
    setAnchor(null);
  }

  return (
    <>
      <IconButton
        aria-label="More"
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: WORKSPACE_COLORS.barText, p: 1 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
        <MenuItem
          aria-label="About CV Builder and its author"
          aria-haspopup="dialog"
          sx={{ minHeight: 44 }}
          onClick={() => {
            close();
            setIsAboutOpen(true);
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          About
        </MenuItem>
        <MenuItem
          aria-label="Your data: backup and restore"
          aria-haspopup="dialog"
          sx={{ minHeight: 44 }}
          onClick={() => {
            close();
            openDataDialog();
          }}
        >
          <ListItemIcon>
            <BackupOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Your data
        </MenuItem>
        <MenuItem
          aria-label="Settings"
          aria-haspopup="dialog"
          sx={{ minHeight: 44 }}
          onClick={() => {
            close();
            openAiSettings();
          }}
        >
          <ListItemIcon>
            <MemoryIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem
          aria-label={
            mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          sx={{ minHeight: 44 }}
          onClick={() => {
            close();
            toggle();
          }}
        >
          <ListItemIcon>
            {mode === "dark" ? (
              <LightModeOutlinedIcon fontSize="small" />
            ) : (
              <DarkModeOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          {mode === "dark" ? "Light" : "Dark"}
        </MenuItem>
        <Tooltip title={COMMIT_TOOLTIP}>
          <Typography
            aria-label={`Version ${APP_VERSION}`}
            sx={{ fontSize: 11, color: WORKSPACE_COLORS.muted, px: 2, py: 0.5 }}
          >
            v{APP_VERSION}
          </Typography>
        </Tooltip>
      </Menu>
      <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
}
