import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useViewport } from "@hooks/use-viewport";
import {
  AtsCategoryId,
  ATS_GROUP_LABELS,
  ATS_GROUP_OF,
  ATS_LABELS,
  ATS_WEIGHTS,
  NATURAL_RANGE,
} from "@shared/ats/ats-score";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** What each category checks: shown in its (i) hint and in the "How is this calculated?" dialog */
export const ATS_CATEGORY_INFO: Record<AtsCategoryId, string> = {
  formatting:
    "Single column, no photo, a sensible page count and skill levels written as words. Tables, columns and graphics are where parsers lose text.",
  searchability:
    "Name, email, phone and location are there, section headings are the usual ones (Work Experience, Education, Skills), every job and course has a start date and the job title is under your name.",
  content:
    'Lines say what you did and how much (a number or result), do not open with weak phrases such as "responsible for", and the CV is neither bare nor too long.',
  hardSkills:
    "The tools, skills and keywords the advert asks for, as words on your CV. Must-haves count double. A different spelling (React.js and React) counts a little less than the exact wording.",
  softSkills:
    "Soft skills the advert names (communication, collaboration, mentoring ...). Only checked when the advert names some.",
  titleExperience:
    "Your job title against the advert's, the years of experience it asks for against your dates, and a degree where the advert mentions one.",
};

const ORDER: AtsCategoryId[] = [
  "formatting",
  "searchability",
  "content",
  "hardSkills",
  "softSkills",
  "titleExperience",
];

/** The shared wording of the disclaimer: also shown at the bottom of the panel */
export const ATS_DISCLAIMER = `Aim for ${NATURAL_RANGE.min}–${NATURAL_RANGE.max}, not 100. A perfect score usually means keyword stuffing and reads as machine-made. A CV that sounds natural and human matters more than the number. Real ATS systems differ.`;

/** "How is this calculated?": the two scores, every check with its weight, and what matters */
export function AtsHelpDialog({
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
      maxWidth="sm"
      fullWidth
      fullScreen={isPhone}
      aria-labelledby="ats-help-title"
    >
      <DialogTitle id="ats-help-title">
        How is the ATS score worked out?
      </DialogTitle>
      <DialogContent dividers sx={{ display: "grid", gap: 2 }}>
        <Typography sx={{ fontSize: 14 }}>
          An ATS (applicant tracking system) reads your CV into fields, and
          recruiters then search and filter those fields by keyword. There is no
          one universal score: sites that show one use their own rules. This is
          a guide built on common advice. It runs on this computer, uses no AI
          and sends nothing anywhere. The same CV always gives the same score,
          so the button only updates the saved scan after you change something.
        </Typography>

        <Box>
          <Typography sx={{ fontWeight: 700 }}>
            Two scores, kept apart
          </Typography>
          <Typography sx={{ fontSize: 14 }}>
            <b>{ATS_GROUP_LABELS.cv}</b> checks the CV itself and does not
            depend on a job. <b>{ATS_GROUP_LABELS.match}</b> compares its words
            with the advert; it needs the job advert to be analysed first. The
            ring shows the average of the two, or the first alone while there is
            no advert.
          </Typography>
        </Box>

        {(["cv", "match"] as const).map((group) => (
          <Box key={group}>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
              {ATS_GROUP_LABELS[group]}
            </Typography>
            {ORDER.filter((id) => ATS_GROUP_OF[id] === group).map((id) => (
              <Box
                key={id}
                sx={{
                  py: 0.75,
                  borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  {ATS_LABELS[id]}
                  <Box
                    component="span"
                    sx={{ color: WORKSPACE_COLORS.muted, fontWeight: 400 }}
                  >
                    {" "}
                    · weight {Math.round(ATS_WEIGHTS[id] * 100)}% of{" "}
                    {group === "cv" ? "your CV" : "the match"}
                  </Box>
                </Typography>
                <Typography
                  sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}
                >
                  {ATS_CATEGORY_INFO[id]}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}

        <Box>
          <Typography sx={{ fontWeight: 700 }}>
            Each category starts at 100
          </Typography>
          <Typography sx={{ fontSize: 14 }}>
            Every issue found takes points off (a second column costs more than
            a missing location). Missing keywords lower the Hard skills score in
            proportion. The number of issues beside a category is the number of
            things to look at.
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700 }}>What matters most</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 14 }}>
            <li>One column, with selectable text (the PDF always has it).</li>
            <li>The usual section names, and dates on every job.</li>
            <li>
              Where it is true, the advert&apos;s own words, once or twice. Do
              not stuff keywords.
            </li>
            <li>Numbers and results instead of duties.</li>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
          {ATS_DISCLAIMER} Scores are saved in this browser for each job, not in
          your data, so they can be compared after you edit.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
