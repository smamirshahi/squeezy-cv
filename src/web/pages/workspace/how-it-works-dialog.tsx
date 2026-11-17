import { useEffect, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Box,
  Button,
  Dialog,
  Drawer,
  IconButton,
  Typography,
  type SxProps,
  type Theme,
} from "@components/ui";
import {
  ArrowDownwardOutlined as ArrowDownwardIcon,
  CheckOutlined as CheckIcon,
  CloseOutlined as CloseIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  VisibilityOffOutlined as VisibilityOffIcon,
  VisibilityOutlined as VisibilityIcon,
} from "@components/ui/icons";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { isBrowserMode } from "@store/persistence/browser/storage-mode";
import {
  isAutoStartOff,
  isTutorialDone,
  markTutorialDone,
  setAutoStartOff,
} from "@pages/workspace/tutorial-seen";

/** The tutorials in the dialog's left list */
export type TutorialId =
  "overview" | "vault" | "template" | "apply" | "applications";

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

/**
 * The picture of a tutorial step. Desktop: a column beside the text (`width` px); small laptop:
 * 80% of that; tablet and phone: the full width above the text, its content centred.
 */
function pictureSx(width: number): SxProps<Theme> {
  return {
    flex: "none",
    width: { xs: "auto", md: Math.round(width * 0.8), lg: width },
    bgcolor: WORKSPACE_COLORS.canvas,
    p: { xs: 2, md: 3 },
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    "& > *": { width: "100%", maxWidth: 560, mx: "auto" },
  };
}

/** The picture on the left: the three layers; the ones in use for the step are lit */
function Diagram({ step }: { step: number }): JSX.Element {
  const isJob = step === 2;
  return (
    <Box aria-hidden="true" sx={pictureSx(340)}>
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
    title: "It stays on your device",
    lead: isBrowserMode()
      ? "Your vault is stored in this browser."
      : "Your vault is a file on this computer.",
    body: [
      <>
        Editing it uploads nothing and shares nothing, so you can keep every
        detail, including ones that only one particular job needs.
      </>,
      <>
        Text only leaves your device when you start an AI feature yourself, and
        only to the provider you chose in Settings.
        {isBrowserMode() && (
          <>
            {" "}
            For AI, add your own key in <b>Settings</b>. It stays in this
            browser and is not part of a backup.
          </>
        )}
      </>,
    ],
    note: "No account, no tracking, and we never see your data.",
  },
  {
    title: "Back it up",
    lead: "Your data is yours, so keeping a copy is up to you.",
    body: isBrowserMode()
      ? [
          <>
            Clearing the site data, using a private window or switching browser
            or device means the vault is not there. Press <b>Data</b> and{" "}
            <b>Download backup</b> now and then, and keep the file somewhere
            safe.
          </>,
          <>
            To move to another device, download a backup there and use{" "}
            <b>Restore from backup</b> here. You can also install the app (the{" "}
            <b>Data</b> button, your browser's install icon, or Share, then “Add
            to Home Screen” on iPhone and iPad): it opens in its own window,
            works offline, and the browser is less likely to clear your data.
          </>,
        ]
      : [
          <>
            Your data is in the <code>data</code> folder. <b>Data</b> also lets
            you download one backup file and restore it.
          </>,
        ],
    note: isBrowserMode()
      ? "Safari on iPhone can delete the data of a website you have not opened for about a week unless it is added to the Home Screen. Install it and keep a backup."
      : "It is your file: copy the folder or download a backup.",
  },
  {
    title: "You choose what reaches a CV",
    lead: "Nothing in the vault appears on a CV by itself.",
    body: [
      <>
        The <b style={{ color: "#B8400D" }}>template</b> decides which{" "}
        <b>sections</b> a CV has, for example “Publications” or “Skills”.
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
    <Box aria-hidden="true" sx={{ ...pictureSx(380), gap: 1.25 }}>
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

interface TemplateStep {
  title: string;
  lead: string;
  body: JSX.Element[];
  note: string;
}

const TEMPLATE_STEPS: TemplateStep[] = [
  {
    title: "A template is how your CV looks",
    lead: "Not what it says.",
    body: [
      <>
        It holds the page layout, which sections exist and where they sit, and
        the colours and text styles. It holds <b>none of your facts</b>. Those
        stay in the vault.
      </>,
      <>
        Many jobs can <b>share one template</b>. Change a font once and every
        job that uses it follows.
      </>,
    ],
    note: "Jobs you have already applied with keep the CV exactly as it was sent.",
  },
  {
    title: "Pick a page layout",
    lead: "A starting point. You can still move every section.",
    body: [
      <>
        <b>Single column (UK)</b> is recommended. It is the easiest layout for
        recruiter software to read, and a good default for UK applications.
      </>,
      <>
        <b>Two columns</b> sit side by side and save space for skills-heavy CVs,
        but some recruiter software reads them less reliably.
      </>,
    ],
    note: "With two columns, a slider sets how wide each column is.",
  },
  {
    title: "Arrange your sections",
    lead: "Order and place, one section at a time.",
    body: [
      <>
        <b>Drag</b> a section, or use the <b>arrows</b>, to set its order and
        place. With two columns, each one can be Full width, Left column or
        Right column.
      </>,
      <>
        The <b>bin</b> removes a section from the CV and <b>Add section</b>{" "}
        brings back one you removed. New kinds of section are made in the Vault.
      </>,
    ],
    note: "Your name and contact details always stay at the top.",
  },
  {
    title: "Style it",
    lead: "Three small groups of choices.",
    body: [
      <>
        <b>Page:</b> margins, date format, icons, space between sections, and
        which details show in the header, such as links or right to work.
      </>,
      <>
        <b>Colours:</b> text, secondary and an optional accent. Two colours are
        enough, and they print well in black and white.
      </>,
      <>
        <b>Typography:</b> size and weight for your name, section headings, item
        titles, body and small text.
      </>,
    ],
    note: "“Reset colours and text styles” puts the colours and text styles back to their defaults.",
  },
  {
    title: "Sections here, items per job",
    lead: "The preview shows your whole vault.",
    body: [
      <>
        While you edit a template, the CV preview on the right shows{" "}
        <b>everything in your vault</b>. That is on purpose: you are designing
        the look, not choosing content.
      </>,
      <>
        Which items appear inside each section is decided <b>per job</b>, in{" "}
        <b>Apply › Template &amp; content</b>.
      </>,
    ],
    note: "Hiding an item never deletes it from the vault.",
  },
];

function TemplateText({ step }: { step: number }): JSX.Element {
  const current = TEMPLATE_STEPS[step];
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

const TEMPLATE_COLOR = "#B8400D";
const JOB_COLOR = "#1E7A46";

/** A small row of the picture: a section with a drag handle */
function SectionRow({
  name,
  tag,
}: {
  name: string;
  tag?: string;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: 30,
        px: 1,
        bgcolor: WORKSPACE_COLORS.panel,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: "4px",
        fontSize: 13,
      }}
    >
      <span style={{ color: WORKSPACE_COLORS.borderStrong }}>⋮⋮</span>
      <span style={{ flex: 1 }}>{name}</span>
      {tag && (
        <Chip
          sx={{
            height: 20,
            borderRadius: "4px",
            border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          }}
        >
          {tag}
        </Chip>
      )}
    </Box>
  );
}

/** A column of the layout picture */
function PictureLines({ count }: { count: number }): JSX.Element {
  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} sx={{ height: 3, bgcolor: "#CFCAC2" }} />
      ))}
    </Box>
  );
}

function LayoutExample({
  title,
  text,
  isTwoColumns,
  isRecommended,
}: {
  title: string;
  text: string;
  isTwoColumns: boolean;
  isRecommended?: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.75,
        alignItems: "flex-start",
        p: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        border: `2px solid ${isRecommended ? TEMPLATE_COLOR : WORKSPACE_COLORS.border}`,
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          flex: "none",
          width: 56,
          height: 78,
          p: 0.9,
          border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Box sx={{ height: 5, width: "60%", bgcolor: "#7D7871" }} />
        {isTwoColumns ? (
          <Box sx={{ display: "flex", gap: 0.5, flex: 1 }}>
            <PictureLines count={4} />
            <PictureLines count={2} />
          </Box>
        ) : (
          <PictureLines count={6} />
        )}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            {title}
          </Typography>
          {isRecommended && (
            <Chip
              sx={{
                bgcolor: JOB_COLOR,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Recommended
            </Chip>
          )}
        </Box>
        <Typography
          sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted, mt: 0.5 }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

function StyleRow({
  label,
  children,
  value,
}: {
  label: string;
  children: JSX.Element | string;
  value?: string;
}): JSX.Element {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12.5 }}>
      <Box component="span" sx={{ width: 110, color: WORKSPACE_COLORS.muted }}>
        {label}
      </Box>
      {children}
      {value && (
        <Box
          component="span"
          sx={{ ml: "auto", color: WORKSPACE_COLORS.muted }}
        >
          {value}
        </Box>
      )}
    </Box>
  );
}

function Swatch({ color }: { color: string }): JSX.Element {
  return (
    <Box
      component="span"
      sx={{
        width: 20,
        height: 20,
        borderRadius: "4px",
        bgcolor: color,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
      }}
    />
  );
}

/** A tick box row of the "items per job" picture */
function ItemRow({
  name,
  isShown,
}: {
  name: string;
  isShown?: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        px: 1.75,
        py: 1,
        fontSize: 13,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        display: "flex",
        alignItems: "center",
        gap: 1,
        opacity: isShown === false ? 0.6 : 1,
        color: isShown === false ? WORKSPACE_COLORS.muted : "inherit",
      }}
    >
      {isShown === undefined ? null : (
        <Box
          component="span"
          sx={{
            width: 16,
            height: 16,
            borderRadius: "3px",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            ...(isShown
              ? { bgcolor: JOB_COLOR, color: "#fff" }
              : { border: `1px solid ${WORKSPACE_COLORS.borderStrong}` }),
          }}
        >
          {isShown ? "✓" : ""}
        </Box>
      )}
      <span style={{ textDecoration: isShown === false ? "line-through" : "" }}>
        {name}
      </span>
    </Box>
  );
}

function TemplatePictureContent({ step }: { step: number }): JSX.Element {
  if (step === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            bgcolor: WORKSPACE_COLORS.panel,
            border: `2px solid ${TEMPLATE_COLOR}`,
            borderRadius: 2,
            p: 1.75,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: TEMPLATE_COLOR,
              }}
            />
            <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
              Two Column CV
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 0.75,
              mt: 1.5,
            }}
          >
            <Box
              sx={{
                gridColumn: "1 / 3",
                height: 8,
                borderRadius: "3px",
                bgcolor: "#D49C80",
              }}
            />
            {[0, 1, 2, 3].map((index) => (
              <Box
                key={index}
                sx={{ height: 5, borderRadius: "3px", bgcolor: "#E5C3B1" }}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1.5 }}>
            {["Layout", "Sections and order", "Colours", "Text styles"].map(
              (name) => (
                <Chip
                  key={name}
                  sx={{
                    bgcolor: WORKSPACE_COLORS.accentSoft,
                    color: WORKSPACE_COLORS.accentText,
                    border: "1px solid #E0A98E",
                  }}
                >
                  {name}
                </Chip>
              )
            )}
          </Box>
        </Box>
        <Box
          sx={{
            height: 22,
            ml: 5,
            borderLeft: `2px dashed ${WORKSPACE_COLORS.borderStrong}`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{ ml: 1.25, fontSize: 11, color: WORKSPACE_COLORS.muted }}
          >
            shared by
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {["Senior React Developer, Ledgerly", "Frontend Engineer, Acme"].map(
            (name) => (
              <Box
                key={name}
                sx={{
                  flex: 1,
                  bgcolor: WORKSPACE_COLORS.panel,
                  border: `2px solid ${JOB_COLOR}`,
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                  Job
                </Typography>
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                >
                  {name}
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>
    );
  }
  if (step === 1) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <LayoutExample
          title="Single column (UK)"
          text="One column, easiest for recruiter software to read."
          isTwoColumns={false}
          isRecommended
        />
        <LayoutExample
          title="Two columns"
          text="Side by side. Saves space for skills-heavy CVs."
          isTwoColumns
        />
        <Typography
          sx={{
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            textAlign: "center",
          }}
        >
          A starting point. You can still move every section.
        </Typography>
      </Box>
    );
  }
  if (step === 2) {
    return (
      <Box
        sx={{
          bgcolor: WORKSPACE_COLORS.panel,
          border: `2px solid ${TEMPLATE_COLOR}`,
          borderRadius: 2,
          p: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
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
          Full width
        </Typography>
        <SectionRow name="Professional Summary" tag="Full width" />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box
            sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
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
              Left column
            </Typography>
            <SectionRow name="Experience" />
          </Box>
          <Box
            sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
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
              Right column
            </Typography>
            <SectionRow name="Education" />
            <SectionRow name="Skills" />
          </Box>
        </Box>
        <Typography
          sx={{ color: TEMPLATE_COLOR, fontSize: 13, fontWeight: 600 }}
        >
          + Add section
        </Typography>
      </Box>
    );
  }
  if (step === 3) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box
          sx={{
            bgcolor: WORKSPACE_COLORS.panel,
            border: `2px solid ${TEMPLATE_COLOR}`,
            borderRadius: 2,
            p: 1.75,
            display: "flex",
            flexDirection: "column",
            gap: 1.1,
          }}
        >
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {["Margin: Narrow", "Date format", "Bullet point icon"].map(
              (name) => (
                <Chip
                  key={name}
                  sx={{
                    height: 22,
                    borderRadius: "4px",
                    border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
                  }}
                >
                  {name}
                </Chip>
              )
            )}
          </Box>
          <StyleRow label="Colours" value="text, secondary, accent">
            <>
              <Swatch color="#555555" />
              <Swatch color="#777777" />
              <Swatch color="#B8400D" />
            </>
          </StyleRow>
          <StyleRow label="Name" value="Bold">
            <b style={{ fontSize: 17 }}>Alex Morgan</b>
          </StyleRow>
          <StyleRow label="Section heading" value="Bold">
            <b style={{ fontSize: 14 }}>Work Experience</b>
          </StyleRow>
          <StyleRow label="Body" value="Regular">
            <span style={{ fontSize: 12 }}>Builds accessible interfaces</span>
          </StyleRow>
        </Box>
        <Typography
          sx={{
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            textAlign: "center",
          }}
        >
          The preview on the right updates as you change things.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box
        sx={{
          bgcolor: WORKSPACE_COLORS.panel,
          border: `2px solid ${TEMPLATE_COLOR}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.75,
            py: 1,
            bgcolor: TEMPLATE_COLOR,
            color: "#fff",
            fontSize: 13,
          }}
        >
          <b style={{ flex: 1 }}>Template preview</b>
          <span>whole vault</span>
        </Box>
        <ItemRow name="Senior Software Developer" />
        <ItemRow name="Software Developer" />
        <ItemRow name="Intern" />
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          color: WORKSPACE_COLORS.muted,
          fontSize: 12,
        }}
      >
        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
        <span>Apply › Template &amp; content</span>
      </Box>
      <Box
        sx={{
          bgcolor: WORKSPACE_COLORS.panel,
          border: `2px solid ${JOB_COLOR}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.75,
            py: 1,
            bgcolor: JOB_COLOR,
            color: "#fff",
            fontSize: 13,
          }}
        >
          <b style={{ flex: 1 }}>Job: Ledgerly</b>
          <span>items chosen here</span>
        </Box>
        <ItemRow name="Senior Software Developer" isShown />
        <ItemRow name="Software Developer" isShown />
        <ItemRow name="Intern" isShown={false} />
      </Box>
    </Box>
  );
}

/** The picture of a template tutorial step */
function TemplatePicture({ step }: { step: number }): JSX.Element {
  return (
    <Box aria-hidden="true" sx={pictureSx(380)}>
      <TemplatePictureContent step={step} />
    </Box>
  );
}

interface ApplyStep {
  title: string;
  lead: string;
  body: JSX.Element[];
  note: JSX.Element | string;
}

const APPLY_STEPS: ApplyStep[] = [
  {
    title: "Start with the advert",
    lead: "The rest of the form is easy. The advert is what matters.",
    body: [
      <>
        Paste the advert text, or choose a PDF, and press <b>Analyse</b>. The AI
        reads it once and lists what the job <b>must have</b>, what is{" "}
        <b>nice to have</b>, and its <b>keywords</b>.
      </>,
      <>Everything after this is measured against that list.</>,
    ],
    note: (
      <>
        <b>Privacy:</b> this step sends only the advert text. Then press{" "}
        <b>Save and continue</b>.
      </>
    ),
  },
  {
    title: "Pick a template, then go section by section",
    lead: "The panel walks you through your CV one section at a time.",
    body: [
      <>
        Choose a <b>template</b> for the look. Then use <b>Back</b> and{" "}
        <b>Next</b> to move through General, Header and links, Professional
        Summary, Experience and the rest.
      </>,
      <>The real CV sits beside the panel and updates as you change things.</>,
    ],
    note: "The section name at the top is a menu, so you can jump straight to any section.",
  },
  {
    title: "Fit it to your page limit",
    lead: "It is the first thing in General, because it shapes the rest.",
    body: [
      <>
        Choose 1 page, 2 pages or a custom limit. The app tells you how far over
        you are and <b>where the next page starts</b>.
      </>,
      <>
        <b>Auto-fit</b> shrinks spacing, then margins, then text size, and never
        below a readable size. It <b>never hides items</b>. To remove items,
        choose them yourself or ask the AI to pick.
      </>,
    ],
    note: (
      <>
        The AI only suggests. <b>Nothing is hidden until you confirm.</b> It
        sees short item labels, line counts and the job&apos;s must-haves, not
        your name or contact details.
      </>
    ),
  },
  {
    title: "Choose what shows, entry by entry",
    lead: "This is where the job decides which vault items to use.",
    body: [
      <>
        The <b>eye</b> shows or hides an entry, or just one of its fields. The{" "}
        <b>star</b> emphasises it. The <b>arrows</b> change its order.
      </>,
      <>
        <b>Score entries</b> rates each one against the advert, for example
        Relevancy 85%, to help you decide. It never hides or moves anything by
        itself, and undo works.
      </>,
    ],
    note: (
      <>
        Hiding affects <b>this job only</b>. It never deletes anything from the
        vault.
      </>
    ),
  },
  {
    title: "Polish the words, only here",
    lead: "Your vault text stays exactly as you wrote it.",
    body: [
      <>
        Open an entry and the AI helps with its description in two steps.{" "}
        <b>1 · Lean on:</b> pick the points from the advert to stress (after you
        have analysed the advert). <b>2 · Then:</b> shorten it, rephrase it,
        make it longer, or <b>make bullets</b>.
      </>,
      <>
        Not happy with the result? <b>Use the vault text</b> puts your original
        words back.
      </>,
    ],
    note: "The AI wording is saved with this job only. Make bullets replaces the description for this job, and “Use the vault’s bullets instead” brings the vault version back.",
  },
  {
    title: "Check, export, mark as applied",
    lead: "The last step has a safety net.",
    body: [
      <>
        <b>Export PDF</b> runs checks first: page limit, contact details,
        selectable text, no photo or date of birth, and how many items you hid.
      </>,
      <>
        Tick <b>Then mark this as applied</b> and the CV is{" "}
        <b>saved exactly as sent</b>. Later changes to the vault or the template
        never alter it.
      </>,
    ],
    note: (
      <>
        Stuck? <b>Chat</b> in the left menu changes things in words, such as
        &ldquo;Fit to 1 page&rdquo;. You approve each change.
      </>
    ),
  },
];

function ApplyText({ step }: { step: number }): JSX.Element {
  const current = APPLY_STEPS[step];
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
    </>
  );
}

const AI_COLOR = "#5B3FD0";
const AI_TEXT = "#4B31B5";
const AI_SOFT = "#EEEAFB";
const GREEN_SOFT = { bgcolor: "#E3F3EA", color: "#175F37" };
const AMBER_SOFT = { bgcolor: "#FFF3DA", color: "#7A4C00" };
const RED_SOFT = { border: "1px solid #D9A5A0", color: "#8C1D18" };

/** A purple outlined "button" of the picture (AI actions are always purple) */
function AiPill({
  children,
  isFilled,
}: {
  children: string;
  isFilled?: boolean;
}): JSX.Element {
  return (
    <Chip
      sx={{
        height: 26,
        borderRadius: "4px",
        border: `1px solid ${AI_COLOR}`,
        bgcolor: isFilled ? AI_COLOR : "#fff",
        color: isFilled ? "#fff" : AI_TEXT,
        fontWeight: isFilled ? 600 : 400,
      }}
    >
      {children}
    </Chip>
  );
}

/** A white card of the picture */
function PicCard({
  children,
  borderColor = WORKSPACE_COLORS.border,
}: {
  children: React.ReactNode;
  borderColor?: string;
}): JSX.Element {
  return (
    <Box
      sx={{
        bgcolor: WORKSPACE_COLORS.panel,
        border: `${borderColor === WORKSPACE_COLORS.border ? 1 : 2}px solid ${borderColor}`,
        borderRadius: 2,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Box>
  );
}

function Caption({ children }: { children: string }): JSX.Element {
  return (
    <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
      {children}
    </Typography>
  );
}

/** One entry row of the "choose what shows" picture */
function ApplyEntry({
  name,
  company,
  score,
  tone,
  isHidden,
  isStarred,
}: {
  name: string;
  company: string;
  score: string;
  tone: SxProps<Theme>;
  isHidden?: boolean;
  isStarred?: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1.1,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        opacity: isHidden ? 0.55 : 1,
      }}
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          color: isHidden ? WORKSPACE_COLORS.muted : TEMPLATE_COLOR,
        }}
      >
        {isHidden ? (
          <VisibilityOffIcon fontSize="small" />
        ) : (
          <VisibilityIcon fontSize="small" />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 13 }}>{name}</b>
        <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
          {company}
        </Typography>
      </Box>
      <Chip sx={tone}>{score}</Chip>
      <span
        style={{ color: isStarred ? TEMPLATE_COLOR : WORKSPACE_COLORS.muted }}
      >
        {isStarred ? "★" : "☆"}
      </span>
      <span style={{ color: WORKSPACE_COLORS.muted }}>↑↓</span>
    </Box>
  );
}

function ApplyPictureContent({ step }: { step: number }): JSX.Element {
  if (step === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <PicCard borderColor={WORKSPACE_COLORS.borderStrong}>
          <Caption>Advert text</Caption>
          <PictureLines count={4} />
        </PicCard>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <AiPill>✦ Analyse</AiPill>
          <Caption>Sends only the advert text.</Caption>
        </Box>
        <PicCard borderColor={AI_COLOR}>
          <b>React Front-End Developer · mid</b>
          <Caption>Must have (4)</Caption>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {[
              "React (v18+)",
              "TypeScript (v5+)",
              "Azure DevOps",
              "REST APIs",
            ].map((text) => (
              <Chip key={text} sx={GREEN_SOFT}>
                {text}
              </Chip>
            ))}
          </Box>
          <Caption>Nice to have (3)</Caption>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {["Vite", "Webpack", "GraphQL"].map((text) => (
              <Chip
                key={text}
                sx={{
                  bgcolor: WORKSPACE_COLORS.canvas,
                  border: `1px solid ${WORKSPACE_COLORS.border}`,
                }}
              >
                {text}
              </Chip>
            ))}
          </Box>
          <Caption>Keywords (27)</Caption>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {["React", "Jest", "Figma", "Agile", "+ 23"].map((text) => (
              <Chip key={text} sx={{ bgcolor: AI_SOFT, color: AI_TEXT }}>
                {text}
              </Chip>
            ))}
          </Box>
        </PicCard>
      </Box>
    );
  }
  if (step === 1) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <b style={{ fontSize: 14 }}>Select template</b>
          <Box
            component="span"
            sx={{
              height: 34,
              px: 1.5,
              bgcolor: WORKSPACE_COLORS.panel,
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 14,
            }}
          >
            Single Column CV <span style={{ fontSize: 10 }}>▾</span>
          </Box>
        </Box>
        <PicCard borderColor={TEMPLATE_COLOR}>
          <Caption>Section 4 of 7</Caption>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
            Experience ▾
          </Typography>
          <Box sx={{ display: "flex", gap: 0.6 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  height: 4,
                  bgcolor: index < 4 ? TEMPLATE_COLOR : WORKSPACE_COLORS.border,
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 0.6, fontSize: 10.5 }}>
            {[
              "General",
              "Header",
              "Summary",
              "Experience",
              "Education",
              "…",
              "…",
            ].map((name, index) => (
              <span
                key={index}
                style={{
                  flex: 1,
                  color: index === 3 ? "#8A2F08" : WORKSPACE_COLORS.muted,
                  fontWeight: index === 3 ? 700 : 400,
                }}
              >
                {name}
              </span>
            ))}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Chip
              sx={{
                height: 32,
                borderRadius: "4px",
                border: `1px solid ${TEMPLATE_COLOR}`,
                color: "#8A2F08",
                fontSize: 13,
              }}
            >
              Back: Professional Summary
            </Chip>
            <Chip
              sx={{
                height: 32,
                borderRadius: "4px",
                bgcolor: TEMPLATE_COLOR,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Next: Education
            </Chip>
          </Box>
        </PicCard>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            component="span"
            sx={{
              flex: "none",
              width: 42,
              height: 56,
              bgcolor: WORKSPACE_COLORS.panel,
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
            }}
          />
          <Caption>
            The real CV stays on the left of the panel and updates as you go.
          </Caption>
        </Box>
      </Box>
    );
  }
  if (step === 2) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <PicCard>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              sx={{
                flex: 1,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".05em",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              PAGE LIMIT
            </Typography>
            <Chip sx={{ ...AMBER_SOFT, height: 22, fontWeight: 600 }}>
              Over by 65 lines
            </Chip>
          </Box>
          <Box
            sx={{
              display: "flex",
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              borderRadius: "4px",
              overflow: "hidden",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {["1 page", "2 pages", "Custom"].map((text, index) => (
              <Box
                key={text}
                sx={{
                  flex: 1,
                  py: 0.9,
                  borderLeft:
                    index > 0
                      ? `1px solid ${WORKSPACE_COLORS.borderStrong}`
                      : "none",
                  bgcolor: index === 0 ? "#FBEBE2" : "transparent",
                  color: index === 0 ? "#8A2F08" : "inherit",
                  fontWeight: index === 0 ? 700 : 400,
                }}
              >
                {text}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="span"
              sx={{
                width: 30,
                height: 40,
                bgcolor: WORKSPACE_COLORS.canvas,
                border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              }}
            />
            <Box
              component="span"
              sx={{ height: 44, borderLeft: "2px dashed #B3261E" }}
            />
            {[0, 1].map((index) => (
              <Box
                key={index}
                component="span"
                sx={{
                  width: 30,
                  height: 40,
                  bgcolor: "#FFF3DA",
                  border: "1px dashed #B58A2E",
                }}
              />
            ))}
            <Box sx={{ ml: 0.75 }}>
              <b style={{ fontSize: 13 }}>3 pages now, limit is 1</b>
              <Caption>Page 2 starts at “Education”.</Caption>
            </Box>
          </Box>
        </PicCard>
        <PicCard>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box
              component="span"
              sx={{
                flex: "none",
                width: 34,
                height: 18,
                mt: "3px",
                borderRadius: "9px",
                bgcolor: WORKSPACE_COLORS.borderStrong,
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 2,
                  top: 2,
                  width: 14,
                  height: 14,
                  borderRadius: "7px",
                  bgcolor: "#fff",
                },
              }}
            />
            <Box>
              <b style={{ fontSize: 13.5 }}>Auto-fit to the limit</b>
              <Caption>
                Spacing first, then margins, then text size. Items are never
                hidden by it.
              </Caption>
            </Box>
          </Box>
        </PicCard>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            sx={{
              height: 32,
              borderRadius: "4px",
              border: `1px solid ${TEMPLATE_COLOR}`,
              color: "#8A2F08",
              fontSize: 13,
            }}
          >
            Choose items to hide
          </Chip>
          <Chip
            sx={{
              height: 32,
              borderRadius: "4px",
              border: `1px solid ${AI_COLOR}`,
              bgcolor: AI_SOFT,
              color: AI_TEXT,
              fontSize: 13,
            }}
          >
            ✦ Ask AI to pick what to hide
          </Chip>
        </Box>
        <Typography sx={{ fontSize: 12, color: AI_TEXT }}>
          AI lists the least relevant items. Nothing is hidden until you
          confirm.
        </Typography>
      </Box>
    );
  }
  if (step === 3) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box
          sx={{
            bgcolor: WORKSPACE_COLORS.panel,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 1,
              px: 1.75,
              py: 1.25,
              bgcolor: "#ECEBE8",
            }}
          >
            <b>Experience</b>
            <Caption>3 of 4 shown</Caption>
          </Box>
          <ApplyEntry
            name="Software Engineer"
            company="AMETEK"
            score="Relevancy 15%"
            tone={RED_SOFT}
          />
          <ApplyEntry
            name="Software Engineer"
            company="Faro Technologies"
            score="Relevancy 85%"
            tone={{ ...GREEN_SOFT, border: "1px solid #B7DFC6" }}
            isStarred
          />
          <ApplyEntry
            name="Software Engineer"
            company="HoloBuilder"
            score="Relevancy 50%"
            tone={{ ...AMBER_SOFT, border: "1px solid #E8CF98" }}
          />
          <ApplyEntry
            name="Researcher"
            company="University of Bremen"
            score="Relevancy 5%"
            tone={RED_SOFT}
            isHidden
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <AiPill>✦ Score entries again</AiPill>
          <Typography sx={{ fontSize: 12, color: AI_TEXT }}>
            Nothing is hidden or moved.
          </Typography>
        </Box>
      </Box>
    );
  }
  if (step === 4) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            bgcolor: WORKSPACE_COLORS.panel,
            border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
            borderRadius: "6px 6px 0 0",
            p: 1.5,
            fontSize: 12.5,
            lineHeight: 1.45,
          }}
        >
          <Caption>Description (your vault text)</Caption>
          Contributed to the HoloBuilder WebEditor and Dashboard, building React
          components that improved construction project data management. Built a
          standalone React application for internal management of subscriptions
          and sales workflows.
        </Box>
        <Box
          sx={{
            bgcolor: AI_SOFT,
            border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
            borderTop: 0,
            borderRadius: "0 0 6px 6px",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: 12,
              color: AI_TEXT,
              fontWeight: 600,
            }}
          >
            <span style={{ flex: 1 }}>✦ AI for React Front-End Developer</span>
            <Chip
              sx={{
                height: 24,
                borderRadius: "4px",
                border: `1px solid ${WORKSPACE_COLORS.border}`,
                bgcolor: WORKSPACE_COLORS.canvas,
                color: WORKSPACE_COLORS.muted,
                fontWeight: 500,
              }}
            >
              Use the vault text
            </Chip>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: 12.5,
            }}
          >
            <b>1 · Lean on</b>
            <AiPill>✦ Pick points from the advert</AiPill>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.75,
              fontSize: 12.5,
            }}
          >
            <b>2 · Then</b>
            <AiPill>Shorten</AiPill>
            <AiPill>Rephrase</AiPill>
            <AiPill>Make longer</AiPill>
            <AiPill isFilled>Make bullets</AiPill>
          </Box>
        </Box>
        <Typography
          sx={{
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            textAlign: "center",
            mt: 1.25,
          }}
        >
          Your original words stay in the vault.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <PicCard borderColor={TEMPLATE_COLOR}>
        <b style={{ fontSize: 14 }}>Export PDF · React Front-End Developer</b>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".05em",
            color: WORKSPACE_COLORS.muted,
          }}
        >
          CHECKS
        </Typography>
        {[
          ["⚠", "#7A4C00", "Does not fit 1 page", " · 65 lines are over"],
          ["✓", "#175F37", "Name, email and phone are there", ""],
          ["✓", "#175F37", "Text is selectable", ""],
          ["✓", "#175F37", "No photo or date of birth", ""],
          [
            "✓",
            "#175F37",
            "3 items hidden in this job",
            " · still in your vault",
          ],
        ].map(([mark, color, bold, rest]) => (
          <Box key={bold} sx={{ fontSize: 12.5, display: "flex", gap: 1 }}>
            <span style={{ color, fontWeight: 700 }}>{mark}</span>
            <span>
              <b>{bold}</b>
              {rest}
            </span>
          </Box>
        ))}
        <Box
          sx={{
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
            pt: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            fontSize: 12.5,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box
              component="span"
              sx={{
                width: 15,
                height: 15,
                border: `1.5px solid ${WORKSPACE_COLORS.muted}`,
                borderRadius: "3px",
              }}
            />
            Also save the data (.json) with the PDF
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box
              component="span"
              sx={{
                width: 15,
                height: 15,
                bgcolor: TEMPLATE_COLOR,
                color: "#fff",
                borderRadius: "3px",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✓
            </Box>
            <b>Then mark this as applied</b>
          </Box>
        </Box>
      </PicCard>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          fontSize: 12.5,
          color: WORKSPACE_COLORS.muted,
        }}
      >
        <Chip sx={{ ...AMBER_SOFT, height: 22, fontWeight: 600 }}>Draft</Chip>
        <span>→</span>
        <Chip sx={{ ...GREEN_SOFT, height: 22, fontWeight: 600 }}>Applied</Chip>
        <span>saved exactly as sent</span>
      </Box>
    </Box>
  );
}

/** The picture of an apply tutorial step */
function ApplyPicture({ step }: { step: number }): JSX.Element {
  return (
    <Box aria-hidden="true" sx={pictureSx(420)}>
      <ApplyPictureContent step={step} />
    </Box>
  );
}

const APPLICATIONS_COLOR = "#1F1D1B";
const SENT_COLOR = "#B8400D";
const GOOD_COLOR = "#1E7A46";

interface ApplicationsStep {
  name: string;
  question: string;
  color: string;
  body: JSX.Element[];
  note: JSX.Element | string;
  /** Only the third step: the numbered steps in the green box */
  numbered?: JSX.Element[];
}

const APPLICATIONS_STEPS: ApplicationsStep[] = [
  {
    name: "Applications",
    question: "Where does each job stand?",
    color: APPLICATIONS_COLOR,
    body: [
      <>
        Every job you create is listed here with its <b>status</b>, the role,
        the template and the day you applied.
      </>,
      <>
        The sidebar groups the statuses into <b>Before sending</b> and{" "}
        <b>Sent</b>, with a count for each. Click one to filter the list.
      </>,
      <>
        Click a row to open the <b>application</b>: the CV you sent, its status
        and its history.
      </>,
    ],
    note: "Search by company, role or template, or sort by newest.",
  },
  {
    name: "Statuses",
    question: "How does a job move forward?",
    color: SENT_COLOR,
    body: [
      <>
        A job moves through these stages <b>in order</b>: Candidate, Draft,
        Ready to apply, Applied, Interview, Offer, Accepted.
      </>,
      <>
        <b>Rejected</b> (they said no) and <b>Withdrawn</b> (you pulled out) can
        happen from several points. They are not a step in the order.
      </>,
      <>
        A <b>Candidate</b> is a job you saved for later, with no CV yet. It can
        also be <b>dropped</b> (taken off the list) or deleted.
      </>,
    ],
    note: "Only Draft and Ready to apply are set on the job itself. Applied and everything after belong to the application.",
  },
  {
    name: "Applied",
    question: "What exactly did I send?",
    color: GOOD_COLOR,
    body: [
      <>
        <b>Mark as applied</b> turns a job into an application and{" "}
        <b>freezes a copy</b> of the CV you sent.
      </>,
      <>
        Later edits to the vault, the template or the job never change that
        copy. Open the application to <b>download the PDF</b> again, or{" "}
        <b>create a new job from it</b>.
      </>,
    ],
    numbered: [
      <>
        Finish the CV and set <b>Ready to apply</b>.
      </>,
      <>
        Export the PDF and send it, then choose <b>Mark as applied</b>.
      </>,
      <>The frozen copy stays with the application.</>,
    ],
    note: "You can also tick “Then mark this as applied” when you export the PDF.",
  },
  {
    name: "Follow up",
    question: "What happens after I send it?",
    color: "#8A5A00",
    body: [
      <>
        Change the status as news arrives: <b>Interview</b>, <b>Offer</b>,{" "}
        <b>Accepted</b>, or <b>Rejected</b> and <b>Withdrawn</b> at any time.
      </>,
      <>
        Each status change is saved <b>with its day</b> in the application’s
        history.
      </>,
      <>
        <b>No reply</b> is not a status. It is a flag the app adds in the
        sidebar to an applied job with no news for 30 days, so you know when to
        nudge.
      </>,
    ],
    note: "Update the status on the day it changes, so the history stays accurate.",
  },
];

function ApplicationsText({ step }: { step: number }): JSX.Element {
  const current = APPLICATIONS_STEPS[step];
  return (
    <>
      <Typography
        id="how-it-works-title"
        component="h2"
        sx={{ m: 0, mb: 1.5, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}
      >
        {current.question}
      </Typography>
      {current.body.map((paragraph, index) => (
        <Box key={index} sx={BULLET_SX}>
          <span>{paragraph}</span>
        </Box>
      ))}
      {current.numbered && (
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
            bgcolor: "#E3F3EA",
            border: "1px solid #B7DFC6",
          }}
        >
          {current.numbered.map((text, index) => (
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
                  bgcolor: GOOD_COLOR,
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
    </>
  );
}

interface StageRow {
  /** A small heading instead of a stage */
  heading?: string;
  name?: string;
  hint?: string;
  color?: string;
  /** The steps (0-based) in which this stage is lit */
  litIn?: number[];
}

const STAGE_ROWS: StageRow[] = [
  { heading: "Saved for later" },
  {
    name: "Candidate",
    hint: "no CV yet",
    color: "#7B5EA7",
    litIn: [1],
  },
  { heading: "On the job" },
  { name: "Draft", hint: "preparing the CV", color: "#1F1D1B", litIn: [1] },
  {
    name: "Ready to apply",
    hint: "CV done, waiting",
    color: "#1F1D1B",
    litIn: [1, 2],
  },
  { heading: "On the application" },
  { name: "Applied", hint: "CV sent", color: SENT_COLOR, litIn: [1, 2, 3] },
  { name: "Interview", hint: "invited", color: GOOD_COLOR, litIn: [1, 3] },
  {
    name: "Offer",
    hint: "received an offer",
    color: GOOD_COLOR,
    litIn: [1, 3],
  },
  { name: "Accepted", hint: "you took it", color: GOOD_COLOR, litIn: [1, 3] },
  { heading: "From several points" },
  { name: "Rejected", hint: "they said no", color: "#B3261E", litIn: [1, 3] },
  {
    name: "Withdrawn",
    hint: "you pulled out",
    color: "#6A655D",
    litIn: [1, 3],
  },
];

/** The sidebar filters of the first step, as small pills with their count */
function SidebarGroup({
  title,
  items,
}: {
  title: string;
  items: [string, number, boolean?][];
}): JSX.Element {
  return (
    <>
      <Typography
        sx={{
          mt: 1.25,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: WORKSPACE_COLORS.muted,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {items.map(([name, count, isOn]) => (
          <Chip
            key={name}
            sx={{
              bgcolor: isOn
                ? WORKSPACE_COLORS.accentSoft
                : WORKSPACE_COLORS.hover,
              color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
              border: `1px solid ${isOn ? "#E0A98E" : WORKSPACE_COLORS.borderStrong}`,
            }}
          >
            {`${name} ${count}`}
          </Chip>
        ))}
      </Box>
    </>
  );
}

function ApplicationsPictureContent({ step }: { step: number }): JSX.Element {
  if (step === 0) {
    return (
      <Box>
        <PicCard borderColor={APPLICATIONS_COLOR}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: APPLICATIONS_COLOR,
              }}
            />
            <b style={{ flex: 1 }}>All jobs</b>
            <Caption>2</Caption>
          </Box>
          <Box>
            <SidebarGroup
              title="Before sending"
              items={[
                ["Candidates", 0],
                ["Draft", 1],
                ["Ready to apply", 0],
              ]}
            />
            <SidebarGroup
              title="Sent"
              items={[
                ["Applied", 1, true],
                ["Interview", 0],
                ["Offer", 0],
                ["Accepted", 0],
                ["Rejected", 0],
                ["Withdrawn", 0],
              ]}
            />
          </Box>
        </PicCard>
        <Box
          sx={{
            height: 26,
            ml: 3,
            borderLeft: `2px dashed ${WORKSPACE_COLORS.borderStrong}`,
          }}
        >
          <Box
            component="span"
            sx={{
              ml: 1.5,
              fontSize: 11,
              position: "relative",
              top: 5,
              color: WORKSPACE_COLORS.muted,
            }}
          >
            click a row to open it
          </Box>
        </Box>
        <PicCard borderColor={SENT_COLOR}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: SENT_COLOR,
              }}
            />
            <b style={{ flex: 1 }}>Acme Ltd</b>
            <Chip
              sx={{
                bgcolor: WORKSPACE_COLORS.accentSoft,
                color: WORKSPACE_COLORS.accentText,
              }}
            >
              Applied
            </Chip>
          </Box>
          <Caption>Frontend Engineer · Sample CV</Caption>
          <Caption>The CV you sent · status · history</Caption>
        </PicCard>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {STAGE_ROWS.map((row) => {
        if (row.heading) {
          return (
            <Typography
              key={row.heading}
              sx={{
                pt: 0.75,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              {row.heading}
            </Typography>
          );
        }
        const color = row.color ?? APPLICATIONS_COLOR;
        const isLit = row.litIn?.includes(step) ?? false;
        return (
          <Box
            key={row.name}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 1.25,
              py: 0.5,
              borderRadius: "6px",
              bgcolor: WORKSPACE_COLORS.panel,
              border: `2px solid ${isLit ? color : WORKSPACE_COLORS.border}`,
              opacity: isLit ? 1 : 0.45,
              boxShadow: isLit ? `0 0 0 3px ${color}22` : "none",
              transition: "opacity .2s, box-shadow .2s",
            }}
          >
            <Box
              component="span"
              sx={{
                flex: "none",
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: color,
              }}
            />
            <b style={{ flex: "none" }}>{row.name}</b>
            <Box
              component="span"
              sx={{
                flex: 1,
                textAlign: "right",
                fontSize: 12,
                color: WORKSPACE_COLORS.muted,
                whiteSpace: "nowrap",
              }}
            >
              {row.hint}
            </Box>
            {step === 2 && row.name === "Applied" && (
              <Chip
                sx={{
                  bgcolor: WORKSPACE_COLORS.accentSoft,
                  color: WORKSPACE_COLORS.accentText,
                  fontWeight: 600,
                }}
              >
                Frozen copy
              </Chip>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/** The picture of an applications tutorial step */
function ApplicationsPicture({ step }: { step: number }): JSX.Element {
  return (
    <Box aria-hidden="true" sx={pictureSx(380)}>
      <ApplicationsPictureContent step={step} />
    </Box>
  );
}

interface Tutorial {
  id: TutorialId;
  name: string;
  /** The short name in the list of tutorials */
  shortName: string;
  summary: string;
  stepNames: string[];
  lastLabel: string;
}

const TUTORIALS: Tutorial[] = [
  {
    id: "overview",
    name: "How Squeezy CV works",
    shortName: "Welcome",
    summary: "Vault, template and job in three steps",
    stepNames: STEPS.map((s) => s.name),
    lastLabel: "Start building",
  },
  {
    id: "vault",
    name: "Your vault",
    shortName: "Vault",
    summary: "What to put in it and how it is used",
    stepNames: VAULT_STEPS.map((s) => s.title),
    lastLabel: "Start filling my vault",
  },
  {
    id: "template",
    name: "Your templates",
    shortName: "Template",
    summary: "How a CV looks: layout, sections and style",
    stepNames: TEMPLATE_STEPS.map((s) => s.title),
    lastLabel: "Start designing",
  },
  {
    id: "apply",
    name: "Applying for a job",
    shortName: "Apply",
    summary: "From the advert to a saved application",
    stepNames: APPLY_STEPS.map((s) => s.title),
    lastLabel: "Start applying",
  },
  {
    id: "applications",
    name: "Your applications",
    shortName: "Applications",
    summary: "Statuses, what you sent and follow up",
    stepNames: APPLICATIONS_STEPS.map((s) => s.name),
    lastLabel: "Got it",
  },
];

/** The round mark in front of a tutorial: a tick when done, a ring for the one that is open */
function DoneMark({
  isDone,
  isCurrent,
}: {
  isDone: boolean;
  isCurrent: boolean;
}): JSX.Element {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        flex: "none",
        width: 20,
        height: 20,
        borderRadius: "50%",
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(isDone
          ? { bgcolor: JOB_COLOR, color: "#fff" }
          : {
              border: `2px solid ${
                isCurrent
                  ? WORKSPACE_COLORS.accent
                  : WORKSPACE_COLORS.borderStrong
              }`,
            }),
      }}
    >
      {isDone && <CheckIcon sx={{ fontSize: 14 }} />}
    </Box>
  );
}

/** "4 steps", "4 steps · done" or, for the open one, "Step 2 of 4" */
function tutorialStatus(
  tutorial: Tutorial,
  isDone: boolean,
  currentStep: number | null
): string {
  const count = tutorial.stepNames.length;
  if (currentStep !== null) {
    return `Step ${currentStep + 1} of ${count}`;
  }
  return isDone ? `${count} steps · done` : `${count} steps`;
}

interface NavProps {
  tutorialId: TutorialId;
  step: number;
  doneIds: ReadonlySet<TutorialId>;
  onChoose: (id: TutorialId) => void;
}

/** One row of the list of tutorials (sidebar on a laptop or desktop, bottom sheet on a phone) */
function NavRow({
  tutorial,
  isCurrent,
  isDone,
  step,
  minHeight,
  onChoose,
}: {
  tutorial: Tutorial;
  isCurrent: boolean;
  isDone: boolean;
  step: number;
  minHeight: number;
  onChoose: () => void;
}): JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      title={tutorial.summary}
      aria-label={`${tutorial.name}, ${tutorialStatus(tutorial, isDone, null)}`}
      aria-current={isCurrent ? "true" : undefined}
      onClick={onChoose}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        width: "100%",
        minHeight,
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        px: 2,
        py: 1,
        border: 0,
        borderLeft: "3px solid",
        borderLeftColor: isCurrent ? WORKSPACE_COLORS.accent : "transparent",
        bgcolor: isCurrent ? WORKSPACE_COLORS.accentSoft : "transparent",
        color: isCurrent ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
        "&:hover": { bgcolor: WORKSPACE_COLORS.accentSoft },
      }}
    >
      <DoneMark isDone={isDone} isCurrent={isCurrent} />
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="span"
          sx={{ display: "block", fontSize: 14, fontWeight: 600 }}
        >
          {tutorial.shortName}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: 12,
            color: isCurrent
              ? WORKSPACE_COLORS.accentText
              : WORKSPACE_COLORS.muted,
          }}
        >
          {tutorialStatus(tutorial, isDone, isCurrent ? step : null)}
        </Typography>
      </Box>
    </Box>
  );
}

/** Desktop and small laptop: the contents sidebar */
function NavSidebar({
  tutorialId,
  step,
  doneIds,
  onChoose,
}: NavProps): JSX.Element {
  return (
    <Box
      component="nav"
      aria-label="Tutorials"
      sx={{
        width: { md: 196, lg: 232 },
        flex: "none",
        pt: 2,
        display: "flex",
        flexDirection: "column",
        bgcolor: WORKSPACE_COLORS.panelAlt,
        borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Typography
        sx={{
          px: 2,
          pb: 1,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: WORKSPACE_COLORS.muted,
        }}
      >
        Tutorials
      </Typography>
      {TUTORIALS.map((t) => (
        <NavRow
          key={t.id}
          tutorial={t}
          isCurrent={t.id === tutorialId}
          isDone={doneIds.has(t.id)}
          step={step}
          minHeight={52}
          onChoose={() => onChoose(t.id)}
        />
      ))}
      <Box sx={{ flex: 1 }} />
      <Typography
        sx={{ px: 2, py: 1.5, fontSize: 13, color: WORKSPACE_COLORS.muted }}
      >
        {doneIds.size} of {TUTORIALS.length} tutorials done
      </Typography>
    </Box>
  );
}

/** Tablet: the contents as a row of tabs on top */
function NavTabs({
  tutorialId,
  step,
  doneIds,
  onChoose,
}: NavProps): JSX.Element {
  return (
    <Box
      component="nav"
      aria-label="Tutorials"
      sx={{
        flex: "none",
        display: "flex",
        gap: 1,
        px: 3,
        py: 1,
        overflowX: "auto",
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      {TUTORIALS.map((t) => {
        const isCurrent = t.id === tutorialId;
        return (
          <Box
            component="button"
            key={t.id}
            type="button"
            aria-label={`${t.name}, ${tutorialStatus(t, doneIds.has(t.id), null)}`}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => onChoose(t.id)}
            sx={{
              flex: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              height: 44,
              px: 1.75,
              font: "inherit",
              fontSize: 14,
              whiteSpace: "nowrap",
              cursor: "pointer",
              borderRadius: 22,
              border: "1px solid",
              borderColor: isCurrent
                ? WORKSPACE_COLORS.accent
                : WORKSPACE_COLORS.borderStrong,
              bgcolor: isCurrent ? WORKSPACE_COLORS.accentSoft : "transparent",
              color: isCurrent
                ? WORKSPACE_COLORS.accentText
                : WORKSPACE_COLORS.text,
              fontWeight: isCurrent ? 600 : 400,
            }}
          >
            {doneIds.has(t.id) && <DoneMark isDone isCurrent={false} />}
            {t.shortName}
            {isCurrent && (
              <Box
                component="span"
                sx={{ color: WORKSPACE_COLORS.muted, fontSize: 12 }}
              >
                · {step + 1} of {t.stepNames.length}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/** "Don't show on start": tutorials stop opening by themselves on a first visit */
function AutoStartSwitch({
  isOff,
  onChange,
  size,
}: {
  isOff: boolean;
  onChange: (isOff: boolean) => void;
  size: number;
}): JSX.Element {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        fontSize: 13,
        color: WORKSPACE_COLORS.muted,
        minHeight: size === 20 ? 48 : undefined,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={isOff}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: size, height: size, margin: 0 }}
      />
      {size === 20
        ? "Don\u2019t show tutorials on start"
        : "Don\u2019t show on start"}
    </Box>
  );
}

/** Phone: a "Tutorial: name" button that opens a bottom sheet with the list */
function NavPicker({
  tutorialId,
  step,
  doneIds,
  onChoose,
  isAutoOff,
  onAutoOff,
}: NavProps & {
  isAutoOff: boolean;
  onAutoOff: (isOff: boolean) => void;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const current = TUTORIALS.find((t) => t.id === tutorialId) ?? TUTORIALS[0];
  return (
    <>
      <Box
        sx={{
          flex: "none",
          px: 1.5,
          py: 1.25,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          color="neutral"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          endIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 48,
            justifyContent: "space-between",
            textTransform: "none",
            fontSize: 15,
            borderColor: WORKSPACE_COLORS.borderStrong,
          }}
        >
          <span>
            <Box
              component="span"
              sx={{ color: WORKSPACE_COLORS.muted, fontWeight: 400 }}
            >
              Tutorial
            </Box>
            &nbsp; <b>{current.shortName}</b>
          </span>
        </Button>
      </Box>
      <Drawer
        anchor="bottom"
        // A drawer sits below dialogs by default, and this one opens above the full-screen dialog
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        slotProps={{
          paper: { sx: { borderRadius: "12px 12px 0 0", maxHeight: "85%" } },
        }}
      >
        <Box role="dialog" aria-label="Choose a tutorial" sx={{ pb: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: 2,
              pr: 0.5,
              pt: 0.5,
            }}
          >
            <Typography sx={{ flex: 1, fontSize: 16, fontWeight: 700 }}>
              Choose a tutorial
            </Typography>
            <IconButton
              aria-label="Close list"
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box component="nav" aria-label="Tutorials" sx={{ mt: 0.5 }}>
            {TUTORIALS.map((t) => (
              <NavRow
                key={t.id}
                tutorial={t}
                isCurrent={t.id === tutorialId}
                isDone={doneIds.has(t.id)}
                step={step}
                minHeight={56}
                onChoose={() => {
                  onChoose(t.id);
                  setIsOpen(false);
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              px: 2,
              mt: 0.5,
              borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          >
            <AutoStartSwitch isOff={isAutoOff} onChange={onAutoOff} size={20} />
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

/** Tutorials with a list to choose between them, each a few steps with a picture */
export function HowItWorksDialog({
  isOpen,
  startTutorial = "overview",
  startStep = 0,
  onClose,
}: HowItWorksDialogProps): JSX.Element {
  const viewport = useViewport();
  const isPhone = viewport === "phone";
  const [tutorialId, setTutorialId] = useState<TutorialId>(startTutorial);
  const [step, setStep] = useState<number>(startStep);
  const [wasOpen, setWasOpen] = useState<boolean>(isOpen);
  const [doneIds, setDoneIds] = useState<ReadonlySet<TutorialId>>(
    () =>
      new Set(TUTORIALS.filter((t) => isTutorialDone(t.id)).map((t) => t.id))
  );
  const [isAutoOff, setIsAutoOff] = useState<boolean>(isAutoStartOff);
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

  // Reaching the last step ticks the tutorial in the list
  useEffect(() => {
    if (isOpen && isLast) {
      markTutorialDone(tutorialId);
      setDoneIds((ids) =>
        ids.has(tutorialId) ? ids : new Set([...ids, tutorialId])
      );
    }
  }, [isOpen, isLast, tutorialId]);

  const choose = (id: TutorialId): void => {
    setTutorialId(id);
    setStep(0);
  };
  const changeAutoOff = (isOff: boolean): void => {
    setAutoStartOff(isOff);
    setIsAutoOff(isOff);
  };
  const navProps: NavProps = { tutorialId, step, doneIds, onChoose: choose };

  const picture =
    tutorialId === "overview" ? (
      <Diagram step={step} />
    ) : tutorialId === "vault" ? (
      <VaultPicture step={step} />
    ) : tutorialId === "apply" ? (
      <ApplyPicture step={step} />
    ) : tutorialId === "applications" ? (
      <ApplicationsPicture step={step} />
    ) : (
      <TemplatePicture step={step} />
    );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      fullScreen={isPhone}
      aria-labelledby="how-it-works-title"
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: "calc(100% - 32px)", md: 960, lg: 1120 },
            maxWidth: { xs: "none", sm: "calc(100% - 32px)" },
            height: { sm: "min(1000px, calc(100% - 32px))", md: 660, lg: 700 },
            maxHeight: { md: "calc(100% - 32px)" },
          },
        },
      }}
    >
      <Box
        sx={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          pl: { xs: 2, sm: 3 },
          pr: 1,
          py: 0.5,
          borderBottom: isPhone
            ? `1px solid ${WORKSPACE_COLORS.border}`
            : { sm: 0, md: `1px solid ${WORKSPACE_COLORS.border}` },
        }}
      >
        <Typography
          sx={{
            flex: 1,
            fontSize: isPhone ? 16 : 12,
            fontWeight: isPhone ? 700 : 600,
            letterSpacing: isPhone ? 0 : ".05em",
            textTransform: isPhone ? "none" : "uppercase",
            color: isPhone ? WORKSPACE_COLORS.text : WORKSPACE_COLORS.muted,
          }}
        >
          {isPhone || viewport === "tablet"
            ? "Tutorials"
            : `${tutorial.shortName} tutorial`}
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ width: 44, height: 44 }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {viewport === "tablet" && <NavTabs {...navProps} />}
      {isPhone && (
        <NavPicker
          {...navProps}
          isAutoOff={isAutoOff}
          onAutoOff={changeAutoOff}
        />
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {(viewport === "desktop" || viewport === "laptop") && (
          <NavSidebar {...navProps} />
        )}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            // Below a laptop the picture and the text scroll together
            overflowY: { xs: "auto", md: "visible" },
          }}
        >
          {picture}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              px: { xs: 2, sm: 4, md: 3.5, lg: 4.5 },
              pt: { xs: 2.25, md: 3.5 },
              pb: 2.5,
              overflowY: { md: "auto" },
            }}
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
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}
            >
              {tutorialId === "overview" ? (
                <OverviewText step={step} />
              ) : tutorialId === "vault" ? (
                <VaultText step={step} />
              ) : tutorialId === "apply" ? (
                <ApplyText step={step} />
              ) : tutorialId === "applications" ? (
                <ApplicationsText step={step} />
              ) : (
                <TemplateText step={step} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: "none",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          gap: { xs: 0.5, sm: 1.5 },
          pl: { xs: 1.5, sm: 2 },
          pr: { xs: 1.5, sm: 2.5 },
          py: 1,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "flex-start" },
          }}
        >
          {tutorial.stepNames.map((name, index) => (
            <IconButton
              key={name}
              aria-label={`Step ${index + 1}: ${name}`}
              aria-current={index === step ? "step" : undefined}
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
        {!isPhone && (
          <AutoStartSwitch
            isOff={isAutoOff}
            onChange={changeAutoOff}
            size={16}
          />
        )}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            "& > button": {
              flex: { xs: 1, sm: "none" },
              minHeight: { xs: 48, sm: 44, lg: 36 },
            },
          }}
        >
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
      </Box>
    </Dialog>
  );
}
