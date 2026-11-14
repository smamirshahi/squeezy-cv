import { ReactNode, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Typography,
} from "@components/ui";
import {
  AutoAwesomeOutlined as AutoAwesomeOutlinedIcon,
  CheckOutlined as CheckOutlinedIcon,
  CloseOutlined as CloseOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  DesktopWindowsOutlined as DesktopWindowsOutlinedIcon,
  FileDownloadOutlined as FileDownloadOutlinedIcon,
  FolderOutlined as FolderOutlinedIcon,
  LinkedIn as LinkedInIcon,
  LocalCafeOutlined as LocalCafeOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  WorkOutlineOutlined as WorkOutlineOutlinedIcon,
} from "@components/ui/icons";
import { APP_VERSION } from "@shared/version";
import { GuideDialog } from "@pages/workspace/guide-dialog";
import { isBrowserMode } from "@store/persistence/browser/storage-mode";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/**
 * What the About dialog says. Edit the texts here. `photoUrl`: a picture in the `public/` folder
 * (for example "/me-avatar.jpg"); empty shows the initials instead.
 */
const ABOUT = {
  name: "Mohammad Amirshahi",
  role: "Software developer · Nottingham, UK",
  photoUrl: "/me-avatar.jpg",
  linkedinUrl: "https://www.linkedin.com/in/mohammadamirshahi/",
  whyLead:
    "I made this for myself. Every job needs a slightly different CV, and keeping track of every version I had sent was a mess.",
  whyMore:
    "I don't like Word, and LaTeX makes templates easy to change but is hard to use. I wanted to write down everything I had done in my own words, without worrying about making it perfect, pick the parts that fit each job, and keep a record of where I applied and how I felt about it. CV Builder is that.",
  ideas: [
    {
      icon: <FolderOutlinedIcon fontSize="small" />,
      title: "Write it once",
      text: "All you have done, in your own words",
    },
    {
      icon: <WorkOutlineOutlinedIcon fontSize="small" />,
      title: "Pick for each job",
      text: "Show only the parts that fit",
    },
    {
      icon: <DescriptionOutlinedIcon fontSize="small" />,
      title: "Keep a record",
      text: "Where you applied and how it felt",
    },
  ],
  supportUrl: "https://ko-fi.com/mohammadamirshahi",
  supportText:
    "CV Builder is free and I work on it in my own time. If it helped you land an interview, a coffee helps me keep improving it.",
} as const;

const AVATAR_SIZE = 64;

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

/** One line in a card of "Your data and AI": a small icon and a sentence */
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
      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
    >
      <Box sx={{ display: "inline-flex", color, pt: "1px", flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 13, lineHeight: "19px" }}>
        {children}
      </Typography>
    </Box>
  );
}

/** A card of "Your data and AI": a title with an icon and its points (the AI card uses the AI colours) */
function PointsCard({
  title,
  icon,
  isAi,
  children,
}: {
  title: string;
  icon: ReactNode;
  isAi?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box
      component="section"
      sx={{
        p: 2,
        display: "grid",
        gap: 1.5,
        alignContent: "start",
        borderRadius: 1.5,
        border: `1px solid ${isAi ? WORKSPACE_COLORS.aiBorder : WORKSPACE_COLORS.border}`,
        bgcolor: isAi ? WORKSPACE_COLORS.aiSoft : "transparent",
        color: isAi ? WORKSPACE_COLORS.aiText : WORKSPACE_COLORS.muted,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: isAi ? WORKSPACE_COLORS.aiText : "text.primary",
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            color: isAi ? WORKSPACE_COLORS.ai : "inherit",
          }}
        >
          {icon}
        </Box>
        <Typography component="h4" sx={{ fontSize: 14, fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      <Box
        component="ul"
        sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.25 }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** About the app and its author: why it exists, data and AI, a way to support it, the version, the privacy note */
export function AboutDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const isBrowser = isBrowserMode();
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="sm"
      scroll="paper"
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

      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          pt: { xs: "20px !important", sm: "24px !important" },
          display: "grid",
          gap: 3,
          alignContent: "start",
          lineHeight: 1.55,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={ABOUT.photoUrl || undefined}
            alt={ABOUT.photoUrl ? ABOUT.name : ""}
            sx={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              fontSize: 24,
              fontWeight: 500,
              flexShrink: 0,
              bgcolor: WORKSPACE_COLORS.accentSoft,
              color: WORKSPACE_COLORS.accentText,
            }}
          >
            {initialsOf(ABOUT.name)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
              {ABOUT.name}
            </Typography>
            <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
              {ABOUT.role}
            </Typography>
          </Box>
          <Button
            component="a"
            href={ABOUT.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="neutral"
            aria-label="LinkedIn profile of Mohammad Amirshahi (opens in a new tab)"
            startIcon={<LinkedInIcon sx={{ color: "#0A66C2" }} />}
            sx={{
              flexShrink: 0,
              minWidth: { xs: 44, sm: 64 },
              height: { xs: 44, sm: 32 },
              px: { xs: 0, sm: 1.5 },
              "& .MuiButton-startIcon": {
                mr: { xs: 0, sm: 1 },
                ml: { xs: 0, sm: -0.25 },
              },
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              LinkedIn
            </Box>
          </Button>
        </Box>

        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Typography component="h3" sx={SECTION_TITLE_SX}>
            Why I made this
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              lineHeight: "20px",
              color: WORKSPACE_COLORS.muted,
            }}
          >
            {ABOUT.whyLead} {ABOUT.whyMore}
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              mt: 0.75,
              p: 0,
              pt: 2,
              listStyle: "none",
              borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {ABOUT.ideas.map((idea) => (
              <Box
                key={idea.title}
                component="li"
                sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 1,
                    bgcolor: WORKSPACE_COLORS.panelAlt,
                  }}
                >
                  {idea.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {idea.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: WORKSPACE_COLORS.muted,
                      mt: 0.25,
                    }}
                  >
                    {idea.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Typography component="h3" sx={SECTION_TITLE_SX}>
            Your data and AI
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <PointsCard
              title="Your data stays with you"
              icon={<DesktopWindowsOutlinedIcon fontSize="small" />}
            >
              <Point
                icon={<CheckOutlinedIcon fontSize="small" />}
                color="text.primary"
              >
                {isBrowser
                  ? "Your data stays in this browser. No account, no tracking, and we never see it."
                  : "Your data stays on your computer. No account, no tracking, and we never see it."}
              </Point>
              <Point
                icon={<LockOutlinedIcon fontSize="small" />}
                color="text.primary"
              >
                Your CV is yours and is not used for anything else.
              </Point>
              <Point
                icon={<FileDownloadOutlinedIcon fontSize="small" />}
                color="text.primary"
              >
                {isBrowser
                  ? "Syncing between devices is harder, so download a backup now and then."
                  : "It is saved as files in the data folder, so back it up now and then."}
              </Point>
            </PointsCard>
            <PointsCard
              isAi
              title="AI is optional and marked"
              icon={<AutoAwesomeOutlinedIcon fontSize="small" />}
            >
              <Point
                icon={<VisibilityOutlinedIcon fontSize="small" />}
                color={WORKSPACE_COLORS.ai}
              >
                Before anything is sent you see the exact text.
              </Point>
              <Point
                icon={<LockOutlinedIcon fontSize="small" />}
                color={WORKSPACE_COLORS.ai}
              >
                Your name, contacts and employers can be masked.
              </Point>
              <Point
                icon={<CheckOutlinedIcon fontSize="small" />}
                color={WORKSPACE_COLORS.ai}
              >
                AI only proposes. You decide what goes on the CV.
              </Point>
            </PointsCard>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            borderRadius: 1.5,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            bgcolor: WORKSPACE_COLORS.panelAlt,
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                bgcolor: WORKSPACE_COLORS.accentSoft,
                color: WORKSPACE_COLORS.accentText,
              }}
            >
              <LocalCafeOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600 }}>
                Support this project
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  lineHeight: "19px",
                  color: WORKSPACE_COLORS.muted,
                }}
              >
                {ABOUT.supportText}
              </Typography>
            </Box>
          </Box>
          <Button
            component={Link}
            href={ABOUT.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            startIcon={<LocalCafeOutlinedIcon />}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              height: { xs: 44, sm: 36 },
            }}
          >
            Buy me a coffee
          </Button>
        </Box>
      </DialogContent>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          bgcolor: WORKSPACE_COLORS.panelAlt,
        }}
      >
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Version {APP_VERSION}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={() => setIsPrivacyOpen(true)}>
          Privacy note
        </Button>
        <Button variant="contained" color="primary" onClick={onClose}>
          Close
        </Button>
      </Box>
      <GuideDialog
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </Dialog>
  );
}
