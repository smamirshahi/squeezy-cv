import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Popover,
  Typography,
} from "@components/ui";
import {
  BookmarkBorderOutlined as BookmarkBorderIcon,
  ChevronRightOutlined as ChevronRightIcon,
  CloseOutlined as CloseIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
} from "@components/ui/icons";
import { Candidate } from "@custom-types/candidate-types";
import { navigate } from "@hooks/navigation";
import { useViewport } from "@hooks/use-viewport";
import { formatDay } from "@shared/application/application-utils";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

interface Props {
  candidates: Candidate[];

  /** The candidate saved a moment ago: marked "Just saved" */
  justSavedId?: string;

  /** Open from outside (the toast's "View list") */
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onContinue: (candidate: Candidate) => void;
}

/** "React Front-End Developer · Ocean Technologies" */
function titleOf(candidate: Candidate): string {
  return [candidate.role, candidate.company]
    .filter((part) => part !== "")
    .join(" · ");
}

function savedText(candidate: Candidate, isJustSaved: boolean): string {
  if (isJustSaved) {
    return "Saved just now";
  }
  // "2 Nov" without the year when it is this year
  const text = formatDay(candidate.createdAt);
  const thisYear = String(new Date().getFullYear());
  return `Saved ${text.endsWith(` ${thisYear}`) ? text.slice(0, -5) : text}`;
}

function Row({
  candidate,
  isJustSaved,
  onContinue,
}: {
  candidate: Candidate;
  isJustSaved: boolean;
  onContinue: () => void;
}): JSX.Element {
  const title = titleOf(candidate);
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1.25,
        minHeight: { xs: 56, md: 0 },
        listStyle: "none",
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        bgcolor: isJustSaved ? WORKSPACE_COLORS.accentSoft : undefined,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {savedText(candidate, isJustSaved)}
        </Typography>
      </Box>
      {isJustSaved && (
        <Chip
          size="small"
          label="Just saved"
          sx={{
            bgcolor: "var(--oks)",
            color: "var(--okt)",
            fontWeight: 600,
            fontSize: 11,
            height: 20,
          }}
        />
      )}
      <Button size="small" variant="outlined" onClick={onContinue}>
        Continue
      </Button>
    </Box>
  );
}

/**
 * The "Saved for later" button at the top of the Job application page and the list it opens: every
 * job parked to do later, with Continue (turns it into a job, where you edit it).
 * A popover on a tablet and up, a bottom sheet on a phone.
 */
export function SavedForLaterMenu({
  candidates,
  justSavedId,
  isOpen,
  onOpenChange,
  onContinue,
}: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = (): void => onOpenChange(false);

  const list = (
    <>
      <Box sx={{ px: 1.5, pt: { xs: 0.5, md: 1.25 }, pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            component="h2"
            sx={{ flex: 1, fontWeight: 700, fontSize: 15 }}
          >
            Saved for later · {candidates.length}
          </Typography>
          {isPhone && (
            <IconButton aria-label="Close" onClick={close}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {isPhone
            ? "Jobs you parked to do later. Tap Continue to turn one into a job."
            : "Jobs you parked to do later"}
        </Typography>
      </Box>
      {candidates.length === 0 ? (
        <Typography
          sx={{ px: 1.5, py: 2, fontSize: 13, color: WORKSPACE_COLORS.muted }}
        >
          Nothing parked yet. Use Save for later on a job you want to come back
          to.
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{ m: 0, p: 0, maxHeight: "50vh", overflow: "auto" }}
        >
          {candidates.map((candidate) => (
            <Row
              key={candidate.id}
              candidate={candidate}
              isJustSaved={candidate.id === justSavedId}
              onContinue={() => {
                close();
                onContinue(candidate);
              }}
            />
          ))}
        </Box>
      )}
      <Button
        onClick={() => {
          close();
          navigate({ kind: "applications", search: "?status=candidate" });
        }}
        endIcon={<ChevronRightIcon />}
        sx={{ justifyContent: "flex-start", px: 1.5, minHeight: 44 }}
      >
        See all in Candidates
      </Button>
    </>
  );

  return (
    <>
      <Button
        variant="outlined"
        color="neutral"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(event) => {
          setAnchor(event.currentTarget);
          onOpenChange(!isOpen);
        }}
        startIcon={<BookmarkBorderIcon />}
        endIcon={isPhone ? undefined : <ExpandMoreIcon />}
        sx={{
          borderColor: WORKSPACE_COLORS.borderStrong,
          ...(isOpen && {
            bgcolor: WORKSPACE_COLORS.accentSoft,
            borderColor: WORKSPACE_COLORS.accent,
            color: WORKSPACE_COLORS.accentText,
          }),
        }}
      >
        {isPhone ? "Saved" : "Saved for later"}
        <Chip
          size="small"
          label={candidates.length}
          sx={{ ml: 1, height: 20, fontSize: 12 }}
        />
      </Button>
      {isPhone ? (
        <Drawer
          anchor="bottom"
          open={isOpen}
          onClose={close}
          slotProps={{
            paper: {
              role: "dialog",
              "aria-label": "Saved for later",
              sx: { borderRadius: "12px 12px 0 0", maxHeight: "75dvh" },
            },
          }}
        >
          {list}
        </Drawer>
      ) : (
        <Popover
          open={isOpen && anchor !== null}
          anchorEl={anchor}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              role: "dialog",
              "aria-label": "Saved for later",
              sx: { width: 440, maxWidth: "calc(100vw - 32px)", mt: 0.5 },
            },
          }}
        >
          {list}
        </Popover>
      )}
    </>
  );
}
