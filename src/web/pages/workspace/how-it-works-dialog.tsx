import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

interface HowItWorksDialogProps {
  isOpen: boolean;
  /** 0 = Vault, 1 = Template, 2 = Job application */
  startStep?: number;
  onClose: () => void;
}

interface Step {
  name: string;
  question: string;
  color: string;
  bullets: JSX.Element[];
  note?: string;
}

const STEPS: Step[] = [
  {
    name: "Vault",
    question: "What do I have?",
    color: "#1F1D1B",
    bullets: [
      <>
        Your <b>facts</b>: jobs, education, skills, projects and links. Write
        each one <b>once</b>.
      </>,
      <>
        Put in <b>everything</b>, relevant or not. Not all of it goes on every
        CV.
      </>,
      <>
        This is the only place you edit facts. Templates and jobs just{" "}
        <b>point to it</b>.
      </>,
    ],
    note: "Hiding something on a CV never deletes it from the vault.",
  },
  {
    name: "Template",
    question: "How does it look?",
    color: "#B8400D",
    bullets: [
      <>
        The <b>look</b> of a CV: sections, their order, layout, fonts, colours
        and the page limit.
      </>,
      <>
        It holds <b>no personal facts</b>, so changing the look never touches
        your content.
      </>,
      <>
        One template can be <b>shared by many jobs</b>. Fix a font once and
        every job using it follows.
      </>,
    ],
    note: "Start with one template. Copy it when you want a second look.",
  },
  {
    name: "Job application",
    question: "Who is it for, and what do I show them?",
    color: "#1E7A46",
    bullets: [
      <>
        A <b>target</b> you apply for, with its ad pasted in.
      </>,
      <>
        It uses <b>both</b>: a <b>template</b> for the look and a choice of{" "}
        <b>vault items</b> to show, with wording and emphasis. The choice is
        saved on the job.
      </>,
    ],
  },
];

const JOB_STEPS: JSX.Element[] = [
  <>Create a job and pick a template.</>,
  <>Choose which items to show.</>,
  <>
    Mark as applied. This <b>freezes a copy</b>, so later edits never change
    what you sent.
  </>,
];

function Pill({
  children,
  isAccent = false,
}: {
  children: string;
  isAccent?: boolean;
}): JSX.Element {
  return (
    <Box
      component="span"
      sx={{
        height: 20,
        px: 1,
        borderRadius: 10,
        border: "1px solid",
        borderColor: isAccent ? "#E0A98E" : WORKSPACE_COLORS.borderStrong,
        bgcolor: isAccent
          ? WORKSPACE_COLORS.accentSoft
          : WORKSPACE_COLORS.hover,
        color: isAccent ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
        fontSize: 11.5,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </Box>
  );
}

function Layer({
  isOn,
  color,
  title,
  caption,
  children,
}: {
  isOn: boolean;
  color: string;
  title: string;
  caption: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <Box
      sx={{
        bgcolor: WORKSPACE_COLORS.panel,
        border: `2px solid ${isOn ? color : WORKSPACE_COLORS.border}`,
        borderRadius: "6px",
        px: 1.5,
        py: 1.25,
        opacity: isOn ? 1 : 0.45,
        boxShadow: isOn ? `0 0 0 3px ${color}33` : "none",
        transition: "opacity .2s, box-shadow .2s",
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}
      >
        <Box
          component="span"
          sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }}
        />
        {title}
      </Box>
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
        {caption}
      </Typography>
      {children}
    </Box>
  );
}

function Link({
  isHot,
  label,
}: {
  isHot: boolean;
  label: string;
}): JSX.Element {
  return (
    <Box
      sx={{
        height: 24,
        ml: 3,
        borderLeft: `2px ${isHot ? "solid #1E7A46" : `dashed ${WORKSPACE_COLORS.borderStrong}`}`,
      }}
    >
      <Box
        component="span"
        sx={{
          ml: 1.5,
          fontSize: 11,
          position: "relative",
          top: 2,
          color: WORKSPACE_COLORS.muted,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** The picture on the left: the three layers; the ones in use for the step are lit */
function Diagram({ step }: { step: number }): JSX.Element {
  const isJob = step === 2;
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 340,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.canvas,
        p: 3,
        display: { xs: "none", sm: "flex" },
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Layer
        isOn={step === 0 || isJob}
        color={STEPS[0].color}
        title="Vault"
        caption="Everything about you, written once"
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          <Pill>3 jobs</Pill>
          <Pill>1 degree</Pill>
          <Pill>8 skills</Pill>
          <Pill>2 projects</Pill>
        </Box>
      </Layer>
      <Link isHot={isJob} label="picked from" />
      <Layer
        isOn={step === 1 || isJob}
        color={STEPS[1].color}
        title="Template"
        caption="How a CV looks"
      >
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              "& > div": {
                height: 5,
                borderRadius: "3px",
                bgcolor: "#E5C3B1",
              },
            }}
          >
            <Box
              sx={{
                gridColumn: "1 / 3",
                height: "7px !important",
                bgcolor: "#D49C80 !important",
              }}
            />
            <Box />
            <Box />
            <Box />
            <Box />
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            <Pill isAccent>Layout</Pill>
            <Pill isAccent>Fonts</Pill>
            <Pill isAccent>2 pages</Pill>
          </Box>
        </Box>
      </Layer>
      <Link isHot={isJob} label="looks like" />
      <Layer
        isOn={isJob}
        color={STEPS[2].color}
        title="Job application"
        caption="Senior React Developer, Ledgerly"
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          <Pill isAccent>Template: Classic</Pill>
          <Pill>Shows 9 of 14 items</Pill>
          <Pill>Reworded summary</Pill>
        </Box>
      </Layer>
    </Box>
  );
}

const BULLET_SX: SxProps<Theme> = {
  display: "flex",
  gap: 1.25,
  fontSize: 14,
  "&::before": {
    content: '""',
    flex: "none",
    width: 6,
    height: 6,
    borderRadius: "50%",
    bgcolor: WORKSPACE_COLORS.borderStrong,
    mt: "9px",
  },
};

/** A short, three-step explanation of Vault -> Template -> Job application */
export function HowItWorksDialog({
  isOpen,
  startStep = 0,
  onClose,
}: HowItWorksDialogProps): JSX.Element {
  const [step, setStep] = useState<number>(startStep);
  const [wasOpen, setWasOpen] = useState<boolean>(isOpen);
  // Every time it opens it starts again: at step 1, or at the step of the (i) that was clicked
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setStep(startStep);
    }
  }
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby="how-it-works-title"
      slotProps={{
        paper: { sx: { width: 900, maxWidth: "calc(100% - 32px)" } },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          pl: 3,
          pr: 1,
          py: 0.5,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: WORKSPACE_COLORS.muted,
          }}
        >
          How CV Builder works
        </Typography>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", minHeight: 440 }}>
        <Diagram step={step} />
        <Box
          sx={{ flex: 1, minWidth: 0, px: 4.5, pt: 3.5, pb: 2.5 }}
          aria-live="polite"
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: WORKSPACE_COLORS.muted,
            }}
          >
            Step {step + 1} of {STEPS.length}
          </Typography>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 1 }}
          >
            <Typography id="how-it-works-title" component="h2" sx={{ m: 0 }}>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 3.5,
                  bgcolor: current.color,
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {current.name}
              </Box>
            </Typography>
            <Typography
              sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted, mb: 1.5 }}
            >
              {current.question}
            </Typography>
            {current.bullets.map((bullet, index) => (
              <Box key={index} sx={BULLET_SX}>
                <span>{bullet}</span>
              </Box>
            ))}
            {current.note && (
              <Box
                sx={{
                  mt: 1.75,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "4px",
                  bgcolor: WORKSPACE_COLORS.canvas,
                  border: `1px solid ${WORKSPACE_COLORS.border}`,
                  fontSize: 13,
                }}
              >
                {current.note}
              </Box>
            )}
            {isLast && (
              <Box
                component="ol"
                sx={{
                  mt: 1.25,
                  mb: 0,
                  p: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  px: 1.75,
                  py: 1.5,
                  borderRadius: "4px",
                  bgcolor: "rgba(30,122,70,.14)",
                  border: "1px solid rgba(30,122,70,.4)",
                  counterReset: "job-step",
                }}
              >
                {JOB_STEPS.map((text, index) => (
                  <Box
                    component="li"
                    key={index}
                    sx={{ display: "flex", gap: 1.25, fontSize: 14 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        flex: "none",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        bgcolor: "#1E7A46",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </Box>
                    <span>{text}</span>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pl: 3,
          pr: 2.5,
          py: 1,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
          {STEPS.map((s, index) => (
            <IconButton
              key={s.name}
              aria-label={`Step ${index + 1}: ${s.name}`}
              onClick={() => setStep(index)}
            >
              <Box
                component="span"
                sx={{
                  display: "block",
                  width: index === step ? 26 : 10,
                  height: 10,
                  borderRadius: "5px",
                  bgcolor:
                    index === step
                      ? WORKSPACE_COLORS.accent
                      : WORKSPACE_COLORS.borderStrong,
                  transition: "width .2s",
                }}
              />
            </IconButton>
          ))}
        </Box>
        <Button
          onClick={() => setStep(Math.max(0, step - 1))}
          sx={{ visibility: step === 0 ? "hidden" : "visible" }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => (isLast ? onClose() : setStep(step + 1))}
        >
          {isLast ? "Start building" : "Next"}
        </Button>
      </Box>
    </Dialog>
  );
}
