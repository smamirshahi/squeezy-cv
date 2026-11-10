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
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** The tutorials in the dialog's left list */
export type TutorialId = "overview" | "vault";

interface HowItWorksDialogProps {
  isOpen: boolean;
  /** Which tutorial it opens on (default: the overview) */
  startTutorial?: TutorialId;
  /** For the overview: 0 = Vault, 1 = Template, 2 = Job application */
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
        Put in <b>everything you have done or achieved</b>, even small or old
        things. Not all of it goes on every CV.
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
        A <b>target</b> you apply for, with its advert pasted in.
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

/** A grey note box under the text of a step */
function Note({ children }: { children: string }): JSX.Element {
  return (
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
      {children}
    </Box>
  );
}

/** Text of one overview step (Vault, Template, Job application) */
function OverviewText({ step }: { step: number }): JSX.Element {
  const current = STEPS[step];
  return (
    <>
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
      <Typography sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted, mb: 1.5 }}>
        {current.question}
      </Typography>
      {current.bullets.map((bullet, index) => (
        <Box key={index} sx={BULLET_SX}>
          <span>{bullet}</span>
        </Box>
      ))}
      {current.note && <Note>{current.note}</Note>}
      {step === STEPS.length - 1 && (
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
    </>
  );
}

interface VaultStep {
  title: string;
  lead: string;
  body: JSX.Element[];
  note: string;
}

const VAULT_STEPS: VaultStep[] = [
  {
    title: "Add what you have done",
    lead: "Big or small, recent or from long ago.",
    body: [
      <>
        The kindergarten you attended, with the years. Coming first in a running
        race at five. Your degree, your jobs. Even a Nobel Prize, if you won
        one.
      </>,
      <>
        Rule of thumb: <b>if it could be on a CV for some job, add it.</b> If
        you did not achieve or finish it, leave it out.
      </>,
    ],
    note: "Dates are optional, so you can add something even when you only half remember it.",
  },
  {
    title: "Describe it in your own words",
    lead: "No bullet points and no polished text, not yet.",
    body: [
      <>
        Write it the way you would tell a friend. Long, messy and unfinished is
        fine.
      </>,
      <>
        Later, when you build a job application, AI can{" "}
        <b>turn it into bullet points</b> or <b>rephrase it</b>. Your original
        words always stay in the vault.
      </>,
    ],
    note: "Nothing is rewritten until you accept it.",
  },
  {
    title: "It stays on your computer",
    lead: "Your vault is a file on this computer.",
    body: [
      <>
        Editing it uploads nothing and shares nothing, so you can keep every
        detail, including ones that only one particular job needs.
      </>,
      <>
        Text only leaves your computer when you start an AI feature yourself,
        and only to the provider you chose in Settings.
      </>,
    ],
    note: "Back it up with Export JSON in the left column. It is your file.",
  },
  {
    title: "You choose what reaches a CV",
    lead: "Nothing in the vault appears on a CV by itself.",
    body: [
      <>
        The <b style={{ color: "#B8400D" }}>template</b> decides which{" "}
        <b>sections</b> a CV has, for example “Early life” or “Awards”.
      </>,
      <>
        The <b style={{ color: "#1E7A46" }}>job</b> decides which <b>items</b>{" "}
        to show for that application. When you apply, it keeps a copy of exactly
        what you sent.
      </>,
    ],
    note: "Hiding an item on a CV never deletes it from the vault.",
  },
];

function VaultText({ step }: { step: number }): JSX.Element {
  const current = VAULT_STEPS[step];
  return (
    <>
      <Typography
        id="how-it-works-title"
        component="h2"
        sx={{ m: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}
      >
        {current.title}
      </Typography>
      <Typography
        sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted, mb: 0.75 }}
      >
        {current.lead}
      </Typography>
      {current.body.map((paragraph, index) => (
        <Typography key={index} sx={{ fontSize: 14 }}>
          {paragraph}
        </Typography>
      ))}
      <Note>{current.note}</Note>
    </>
  );
}

/** [title, subtitle, shown on the example CV] */
const VAULT_EXAMPLE_ITEMS: [string, string, boolean][] = [
  ["Little Stars Kindergarten", "1992 to 1995", false],
  ["1st place, school running race", "Age 5", false],
  ["Senior Software Developer", "Example Ltd, 2022 to present", true],
  ["BSc Computer Science", "University of Leeds, 2015", true],
  ["Regional chess champion", "2013", false],
  ["Volunteer youth cycling coach", "2019 to present", true],
];

function Chip({
  children,
  sx,
}: {
  children: string;
  sx: SxProps<Theme>;
}): JSX.Element {
  return (
    <Box
      component="span"
      sx={[
        {
          flex: "none",
          height: 20,
          px: 1,
          borderRadius: 10,
          fontSize: 11.5,
          display: "inline-flex",
          alignItems: "center",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

/** The picture of a vault tutorial step: a list of items, or one item being edited */
function VaultPicture({ step }: { step: number }): JSX.Element {
  const isList = step !== 1;
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 380,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.canvas,
        p: 3,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "center",
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          bgcolor: WORKSPACE_COLORS.panel,
          border: "2px solid #1F1D1B",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.75,
            py: 1.25,
            bgcolor: "#1F1D1B",
            color: "#fff",
          }}
        >
          <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
            My vault
          </Typography>
          {step === 2 && (
            <Chip
              sx={{
                height: 22,
                gap: 0.6,
                bgcolor: "#E3F3EA",
                color: "#175F37",
                fontWeight: 600,
              }}
            >
              On this computer only
            </Chip>
          )}
        </Box>
        {isList &&
          VAULT_EXAMPLE_ITEMS.map(([title, sub, isShown], index) => {
            const isDimmed = step === 3 && !isShown;
            return (
              <Box
                key={title}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.75,
                  py: 1.1,
                  borderTop:
                    index === 0 ? 0 : `1px solid ${WORKSPACE_COLORS.border}`,
                  opacity: isDimmed ? 0.5 : 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      textDecoration: isDimmed ? "line-through" : "none",
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}
                  >
                    {sub}
                  </Typography>
                </Box>
                {step === 0 && (
                  <Chip
                    sx={{
                      bgcolor: WORKSPACE_COLORS.hover,
                      border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
                    }}
                  >
                    Added
                  </Chip>
                )}
                {step === 3 && (
                  <Chip
                    sx={
                      isShown
                        ? {
                            bgcolor: "#E3F3EA",
                            color: "#175F37",
                            border: "1px solid #B7DFC6",
                          }
                        : {
                            color: WORKSPACE_COLORS.muted,
                            border: `1px dashed ${WORKSPACE_COLORS.borderStrong}`,
                          }
                    }
                  >
                    {isShown ? "On this CV" : "Vault only"}
                  </Chip>
                )}
              </Box>
            );
          })}
        {!isList && (
          <Box sx={{ px: 1.75, pt: 1.5, pb: 1.75 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
              Senior Software Developer
            </Typography>
            <Typography
              sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted, mb: 1.25 }}
            >
              Example Ltd · Mar 2022 to present
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: WORKSPACE_COLORS.muted,
                }}
              >
                Description
              </Typography>
              <Chip
                sx={{
                  bgcolor: WORKSPACE_COLORS.accentSoft,
                  color: WORKSPACE_COLORS.accentText,
                  fontWeight: 600,
                }}
              >
                Your own words
              </Chip>
            </Box>
            <Box
              sx={{
                border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
                borderRadius: "4px",
                px: 1.25,
                py: 1,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              I built the customer dashboard, about 200 people use it at work. I
              brought in Redux Toolkit and we got a lot fewer state bugs. I also
              helped two junior developers get started.
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                my: 1.5,
                color: WORKSPACE_COLORS.muted,
                fontSize: 12,
              }}
            >
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
              <span>
                <b>Later, only if you want:</b> AI turns it into
              </span>
            </Box>
            <Box
              sx={{
                border: `1px dashed ${WORKSPACE_COLORS.borderStrong}`,
                borderRadius: "4px",
                px: 1.25,
                py: 1,
                fontSize: 12.5,
                color: WORKSPACE_COLORS.muted,
                display: "flex",
                flexDirection: "column",
                gap: 0.4,
              }}
            >
              <span>
                • Led development of a React dashboard used by 200 internal
                users
              </span>
              <span>• Introduced Redux Toolkit and cut state-related bugs</span>
              <span>• Mentored two junior developers</span>
            </Box>
          </Box>
        )}
      </Box>
      {step === 3 && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <Chip
            sx={{
              height: 26,
              px: 1.5,
              borderRadius: 13,
              bgcolor: "#B8400D",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Template decides
          </Chip>
          <Chip
            sx={{
              height: 26,
              px: 1.5,
              borderRadius: 13,
              bgcolor: "#1E7A46",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Job decides
          </Chip>
        </Box>
      )}
    </Box>
  );
}

interface Tutorial {
  id: TutorialId;
  name: string;
  summary: string;
  stepNames: string[];
  lastLabel: string;
}

const TUTORIALS: Tutorial[] = [
  {
    id: "overview",
    name: "How CV Builder works",
    summary: "Vault, template and job in three steps",
    stepNames: STEPS.map((s) => s.name),
    lastLabel: "Start building",
  },
  {
    id: "vault",
    name: "Your vault",
    summary: "What to put in it and how it is used",
    stepNames: VAULT_STEPS.map((s) => s.title),
    lastLabel: "Start filling my vault",
  },
];

/** Tutorials with a list on the left to choose between them, each a few steps with a picture */
export function HowItWorksDialog({
  isOpen,
  startTutorial = "overview",
  startStep = 0,
  onClose,
}: HowItWorksDialogProps): JSX.Element {
  const [tutorialId, setTutorialId] = useState<TutorialId>(startTutorial);
  const [step, setStep] = useState<number>(startStep);
  const [wasOpen, setWasOpen] = useState<boolean>(isOpen);
  // Every time it opens it starts again: at the tutorial and step that were asked for
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTutorialId(startTutorial);
      setStep(startStep);
    }
  }
  const tutorial = TUTORIALS.find((t) => t.id === tutorialId) ?? TUTORIALS[0];
  const count = tutorial.stepNames.length;
  const isLast = step === count - 1;

  const choose = (id: TutorialId): void => {
    setTutorialId(id);
    setStep(0);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby="how-it-works-title"
      slotProps={{
        paper: { sx: { width: 1180, maxWidth: "calc(100% - 32px)" } },
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
          Tutorials
        </Typography>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", minHeight: 520 }}>
        <Box
          component="nav"
          aria-label="Tutorials"
          sx={{
            width: 220,
            flex: "none",
            p: 1.5,
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            gap: 0.5,
            borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          {TUTORIALS.map((t) => {
            const isCurrent = t.id === tutorialId;
            return (
              <Box
                component="button"
                key={t.id}
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => choose(t.id)}
                sx={{
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  px: 1.5,
                  py: 1,
                  borderRadius: "4px",
                  border: "1px solid",
                  borderColor: isCurrent
                    ? WORKSPACE_COLORS.accent
                    : "transparent",
                  bgcolor: isCurrent
                    ? WORKSPACE_COLORS.accentSoft
                    : "transparent",
                  color: isCurrent
                    ? WORKSPACE_COLORS.accentText
                    : WORKSPACE_COLORS.text,
                  "&:hover": { bgcolor: WORKSPACE_COLORS.accentSoft },
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  {t.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: isCurrent
                      ? WORKSPACE_COLORS.accentText
                      : WORKSPACE_COLORS.muted,
                  }}
                >
                  {t.summary}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {tutorialId === "overview" ? (
          <Diagram step={step} />
        ) : (
          <VaultPicture step={step} />
        )}
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
            {tutorial.name} · Step {step + 1} of {count}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
            {tutorialId === "overview" ? (
              <OverviewText step={step} />
            ) : (
              <VaultText step={step} />
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
          {tutorial.stepNames.map((name, index) => (
            <IconButton
              key={name}
              aria-label={`Step ${index + 1}: ${name}`}
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
          {isLast ? tutorial.lastLabel : "Next"}
        </Button>
      </Box>
    </Dialog>
  );
}
