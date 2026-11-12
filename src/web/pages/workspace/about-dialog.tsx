import { ReactNode } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LocalCafeOutlinedIcon from "@mui/icons-material/LocalCafeOutlined";
import { cssVar } from "@custom-styles/theme";
import { APP_VERSION } from "@shared/version";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/**
 * What the About dialog says. Edit the texts here. `photoUrl`: a picture in the `public/` folder
 * (for example "/me.jpg"); empty shows the initials instead.
 */
const ABOUT = {
  name: "Mohammad Amirshahi",
  role: "Software developer · Nottingham, UK",
  photoUrl: "",
  linkedinUrl: "https://www.linkedin.com/in/mohammadamirshahi/",
  why: "I build software and wanted a better way to keep my own CV in shape. Every job asks for a slightly different CV, and rewriting it each time is slow and easy to get wrong. CV Builder keeps everything you have done in one place, and lets each job application show only what matters for that job.",
  supportUrl: "https://ko-fi.com/mohammadamirshahi",
  supportText:
    "CV Builder is free and I work on it in my own time. If it helped you land an interview, or saved you an evening of fiddling with a document, a coffee helps me keep improving it.",
} as const;

const AVATAR_SIZE = 72;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

const SECTION_TITLE_SX = {
  m: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: WORKSPACE_COLORS.muted,
} as const;

/** One line of "Your data and AI": an icon and a sentence (AI lines use the AI colour) */
function Point({
  icon,
  color,
  children,
}: {
  icon: ReactNode;
  color: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box
      component="li"
      sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
    >
      <Box sx={{ display: "inline-flex", color }}>{icon}</Box>
      <Typography sx={{ fontSize: 14 }}>{children}</Typography>
    </Box>
  );
}

/** About the app and its author: who made it and why, how data and AI are handled, a way to support it, the version and the links */
export function AboutDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="sm"
      aria-labelledby="about-title"
    >
      <DialogTitle
        id="about-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 16,
          fontWeight: 600,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        About CV Builder
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 3, display: "grid", gap: 2.5, lineHeight: 1.55 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={ABOUT.photoUrl || undefined}
            alt={ABOUT.photoUrl ? ABOUT.name : ""}
            sx={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              fontSize: 26,
              fontWeight: 500,
              bgcolor: WORKSPACE_COLORS.accentSoft,
              color: WORKSPACE_COLORS.accentText,
            }}
          >
            {initialsOf(ABOUT.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600 }}>
              {ABOUT.name}
            </Typography>
            <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
              {ABOUT.role}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="LinkedIn (opens in a new tab)">
            <IconButton
              component="a"
              href={ABOUT.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile of Mohammad Amirshahi (opens in a new tab)"
              sx={{ color: "#0A66C2" }}
            >
              <LinkedInIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "grid", gap: 0.75 }}>
          <Typography component="h3" sx={SECTION_TITLE_SX}>
            Why I made this
          </Typography>
          <Typography sx={{ fontSize: 14 }}>{ABOUT.why}</Typography>
        </Box>

        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography component="h3" sx={SECTION_TITLE_SX}>
            Your data and AI
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: "none",
              display: "grid",
              gap: 1,
            }}
          >
            <Point
              color={WORKSPACE_COLORS.accent}
              icon={<DesktopWindowsOutlinedIcon fontSize="small" />}
            >
              Your data stays on your computer.
            </Point>
            <Point
              color={WORKSPACE_COLORS.ai}
              icon={<AutoAwesomeOutlinedIcon fontSize="small" />}
            >
              AI is optional, and always marked.
            </Point>
            <Point
              color={WORKSPACE_COLORS.accent}
              icon={<CheckOutlinedIcon fontSize="small" />}
            >
              AI only proposes. You decide what goes on the CV.
            </Point>
          </Box>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "grid",
            gap: 1,
            bgcolor: cssVar("oks"),
            borderColor: cssVar("ok"),
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Typography
              component="h3"
              sx={{ fontSize: 14, fontWeight: 700, color: cssVar("okt") }}
            >
              Support this project
            </Typography>
            <Button
              component={Link}
              href={ABOUT.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
              startIcon={<LocalCafeOutlinedIcon />}
            >
              Buy me a coffee
            </Button>
          </Box>
          <Typography sx={{ fontSize: 13, color: cssVar("okt") }}>
            {ABOUT.supportText}
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 3,
          py: 1.5,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          bgcolor: WORKSPACE_COLORS.panelAlt,
        }}
      >
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Version {APP_VERSION}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Dialog>
  );
}
