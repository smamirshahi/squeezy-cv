import { Box, IconButton, Tooltip, Typography } from "@components/ui";
import {
  ArrowForwardOutlined as ArrowForwardIcon,
  FeedbackOutlined as FeedbackOutlinedIcon,
  HelpOutlineOutlined as HelpOutlineIcon,
  InfoOutlined as InfoOutlinedIcon,
  RedoOutlined as RedoIcon,
  UndoOutlined as UndoIcon,
} from "@components/ui/icons";
import { redo, undo } from "@store/history/history";
import { SaveStatus } from "@pages/editor-page/save-status";
import { useEffect, useState } from "react";
import {
  HowItWorksDialog,
  type TutorialId,
} from "@pages/workspace/how-it-works-dialog";
import {
  hasSeenTutorial,
  isAutoStartOff,
  markTutorialSeen,
  type FirstVisitTutorial,
} from "@pages/workspace/tutorial-seen";
import { FeedbackDialog } from "@pages/workspace/feedback-dialog";
import { onAppLinkClick, useRoute } from "@hooks/navigation";
import { formatRoute, type Route } from "@shared/routing/routes";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { MoreMenu } from "@pages/workspace/more-menu";
import { useViewport } from "@hooks/use-viewport";

/** Label of a history step for a tooltip: the action name without its slice prefix */
function stepLabel(type: string | undefined): string {
  return type ? type.replace(/^[a-z]+\//, "") : "";
}

/** Undo and redo for every edit (manual or by the chat) since the file was loaded */
function UndoRedo(): JSX.Element {
  const dispatch = useAppDispatch();
  const { past, future } = useAppSelector((s) => s.history);
  return (
    <Box sx={{ display: "flex", gap: 0.25 }}>
      <Tooltip
        title={
          past.length > 0
            ? `Undo ${stepLabel(past.at(-1)?.type)} (⌘Z)`
            : "Nothing to undo"
        }
      >
        <span>
          <IconButton
            size="small"
            aria-label="Undo"
            disabled={past.length === 0}
            onClick={() => dispatch(undo())}
            sx={{
              p: { xs: 1, lg: "5px" },
              color: WORKSPACE_COLORS.barText,
              "&.Mui-disabled": {
                opacity: 0.35,
                color: WORKSPACE_COLORS.barText,
              },
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          future.length > 0
            ? `Redo ${stepLabel(future[0]?.type)} (⇧⌘Z)`
            : "Nothing to redo"
        }
      >
        <span>
          <IconButton
            size="small"
            aria-label="Redo"
            disabled={future.length === 0}
            onClick={() => dispatch(redo())}
            sx={{
              p: { xs: 1, lg: "5px" },
              color: WORKSPACE_COLORS.barText,
              "&.Mui-disabled": {
                opacity: 0.35,
                color: WORKSPACE_COLORS.barText,
              },
            }}
          >
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

interface FlowStep {
  label: string;
  target: Route;
  kinds: Route["kind"][];
  info: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    label: "Vault",
    target: { kind: "vault" },
    kinds: ["vault"],
    info: "Everything you have done: jobs, education, skills, links. Enter each fact once. Nothing here decides how a CV looks or what it shows.",
  },
  {
    label: "Template",
    target: { kind: "templates", tab: "templates" },
    kinds: ["templates"],
    info: "How a CV looks: which sections, their order, the page layout and the style. Many jobs can share one template, so a change of look reaches all of them.",
  },
  {
    label: "Job application",
    target: { kind: "jobs", view: "page" },
    kinds: ["jobs", "chat"],
    info: "One target. It picks a template, then chooses which items to show and how they are worded. Exporting and marking as applied freezes a copy of what you sent.",
  },
];

/** Vault -> Template -> Job application: three button-like steps, each with an (i) saying what it is */
function FlowSteps({
  onInfo,
}: {
  onInfo: (step: number) => void;
}): JSX.Element {
  const route = useRoute();
  return (
    <Box
      component="nav"
      aria-label="How the app works"
      sx={{
        // Centred on the bar on a wide screen; in the flow (so it cannot collide) below that
        position: { xs: "static", lg: "absolute" },
        left: { lg: "50%" },
        top: { lg: "50%" },
        transform: { xs: "none", lg: "translate(-50%, -50%)" },
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, lg: 1 },
        minWidth: 0,
      }}
    >
      {FLOW_STEPS.map((step, index) => {
        const isCurrent = step.kinds.includes(route.kind);
        return (
          <Box
            key={step.label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, lg: 1 },
            }}
          >
            {index > 0 && (
              <ArrowForwardIcon
                aria-hidden
                sx={{
                  fontSize: 18,
                  opacity: 0.55,
                  display: { xs: "none", md: "block" },
                }}
              />
            )}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: 32,
                pl: { xs: 1.25, lg: 1.75 },
                pr: 0.5,
                gap: 0.5,
                borderRadius: 999,
                border: "1px solid",
                borderColor: isCurrent
                  ? "rgba(255,255,255,.55)"
                  : "rgba(255,255,255,.18)",
                bgcolor: isCurrent
                  ? "rgba(255,255,255,.22)"
                  : "rgba(255,255,255,.08)",
                transition: "background-color .15s",
                "&:hover": {
                  bgcolor: isCurrent
                    ? "rgba(255,255,255,.28)"
                    : "rgba(255,255,255,.16)",
                },
              }}
            >
              <Box
                component="a"
                href={formatRoute(step.target)}
                aria-current={isCurrent ? "page" : undefined}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  onAppLinkClick(event, step.target)
                }
                sx={{
                  color: "inherit",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: isCurrent ? 700 : 500,
                  whiteSpace: "nowrap",
                  lineHeight: "30px",
                }}
              >
                {step.label}
              </Box>
              <Tooltip title={step.info} arrow>
                <IconButton
                  size="small"
                  aria-label={`What is ${step.label}?`}
                  onClick={() => onInfo(index)}
                  sx={{ color: WORKSPACE_COLORS.barText, p: 0.5, opacity: 0.8 }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** The tutorial that belongs to a page (Apply covers the job and the chat, Applications the list and one application), if it has one */
function tutorialOfRoute(kind: Route["kind"]): FirstVisitTutorial | null {
  switch (kind) {
    case "vault":
      return "vault";
    case "templates":
      return "template";
    case "jobs":
    case "chat":
      return "apply";
    case "applications":
    case "application":
      return "applications";
    default:
      return null;
  }
}

/** The dark bar on top: the app flow, save state and the main actions */
export function TopBar(): JSX.Element {
  const [help, setHelp] = useState<{
    tutorial: TutorialId;
    step: number;
  } | null>(null);
  // The (i) of "Job application" opens its own tutorial, the others the overview
  const openHelp = (step: number): void =>
    setHelp(
      step === 2
        ? { tutorial: "apply", step: 0 }
        : { tutorial: "overview", step }
    );
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const route = useRoute();
  const isPhone = useViewport() === "phone";

  // The first time a page is opened, its tutorial shows; after that only the buttons do
  const visited = tutorialOfRoute(route.kind);
  useEffect(() => {
    if (visited && !isAutoStartOff() && !hasSeenTutorial(visited)) {
      markTutorialSeen(visited);
      setHelp({ tutorial: visited, step: 0 });
    }
  }, [visited]);

  return (
    <Box
      component="header"
      sx={{
        position: "relative",
        height: 48,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, md: 1.5 },
        px: { xs: 1, md: 1.5 },
        minWidth: 0,
        bgcolor: WORKSPACE_COLORS.bar,
        color: WORKSPACE_COLORS.barText,
        "& .MuiButton-root": {
          color: WORKSPACE_COLORS.barText,
          whiteSpace: "nowrap",
          flex: "none",
        },
      }}
    >
      <img
        src="/favicon.svg"
        alt=""
        width={22}
        height={22}
        style={{ flex: "none", borderRadius: 5 }}
      />
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: "nowrap",
          // The pills need the room on a tablet; the name returns on a laptop
          display: { xs: "block", sm: "none", md: "block" },
        }}
      >
        Squeezy CV
      </Typography>
      <IconButton
        size="small"
        aria-label="Tutorials"
        onClick={() => openHelp(0)}
        sx={{
          color: WORKSPACE_COLORS.barText,
          ml: -0.5,
          p: { xs: 1, lg: "5px" },
        }}
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
      <Tooltip title="Send feedback">
        <IconButton
          size="small"
          aria-label="Send feedback"
          onClick={() => setIsFeedbackOpen(true)}
          sx={{
            color: WORKSPACE_COLORS.barText,
            ml: -1,
            p: { xs: 1, lg: "5px" },
          }}
        >
          <FeedbackOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      {!isPhone && <FlowSteps onInfo={openHelp} />}
      <Box sx={{ flex: 1 }} />
      {/* The status grows to the left, so undo and redo never move */}
      <SaveStatus />
      <UndoRedo />
      {isPhone && <MoreMenu />}
      <FeedbackDialog
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
      <HowItWorksDialog
        isOpen={help !== null}
        startTutorial={help?.tutorial}
        startStep={help?.step ?? 0}
        onClose={() => setHelp(null)}
      />
    </Box>
  );
}
