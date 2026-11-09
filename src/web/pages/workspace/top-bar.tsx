import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { redo, undo } from "@store/history/history";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { SaveStatus } from "@pages/editor-page/save-status";
import { MarkAsApplied } from "@pages/applications-page/mark-as-applied";
import { useState } from "react";
import { ExportDialog } from "@pages/workspace/export-dialog";
import { HowItWorksDialog } from "@pages/workspace/how-it-works-dialog";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { formatRoute, type Route } from "@shared/routing/routes";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

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
    kinds: ["jobs", "tailor", "chat"],
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
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {FLOW_STEPS.map((step, index) => {
        const isCurrent = step.kinds.includes(route.kind);
        return (
          <Box
            key={step.label}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            {index > 0 && (
              <ArrowForwardIcon
                aria-hidden
                sx={{ fontSize: 18, opacity: 0.55 }}
              />
            )}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: 32,
                pl: 1.75,
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

/** The dark bar on top: the app flow, save state and the main actions */
export function TopBar(): JSX.Element {
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [helpStep, setHelpStep] = useState<number | null>(null);
  const openHelp = (step: number): void => setHelpStep(step);

  return (
    <Box
      component="header"
      sx={{
        position: "relative",
        height: 48,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        bgcolor: WORKSPACE_COLORS.bar,
        color: WORKSPACE_COLORS.barText,
        "& .MuiButton-root": {
          color: WORKSPACE_COLORS.barText,
          whiteSpace: "nowrap",
          flex: "none",
        },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, mr: 0.5 }}>
        CV Builder
      </Typography>
      <Box sx={{ flex: 1 }} />
      <FlowSteps onInfo={openHelp} />
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        variant="outlined"
        startIcon={<HelpOutlineIcon />}
        onClick={() => openHelp(0)}
        sx={{ borderColor: "rgba(255,255,255,.3)" }}
      >
        How it works
      </Button>
      <UndoRedo />
      <SaveStatus />
      <Button
        size="small"
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => navigate({ kind: "tailor" })}
        sx={{
          bgcolor: WORKSPACE_COLORS.ai,
          color: WORKSPACE_COLORS.aiContrast,
          "&:hover": {
            bgcolor: WORKSPACE_COLORS.ai,
            filter: "brightness(.92)",
          },
        }}
      >
        Tailor to job ad
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PictureAsPdfIcon />}
        onClick={() => setIsExportOpen(true)}
        sx={{ borderColor: "rgba(255,255,255,.3)" }}
      >
        Export PDF
      </Button>
      <MarkAsApplied />
      <HowItWorksDialog
        isOpen={helpStep !== null}
        startStep={helpStep ?? 0}
        onClose={() => setHelpStep(null)}
      />
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </Box>
  );
}
