import { Grid } from "@mui/material";
import { SectionTitle } from "../../common/custom-typography";
import { ExperiencesSubsection } from "./experiences-subsection";
import { applicantSelector } from "../../store/applicant/applicant-slice";
import { useAppSelector } from "../../store/store-helper";

interface Props {
  /** The title of the section */
  sectionTitle: "Education" | "Work Experience";
}

/** Renders the whole experiences part */
export function Experiences({ sectionTitle }: Props): JSX.Element {
  const { workExperiences, education } = useAppSelector(applicantSelector);

  const content =
    sectionTitle === "Work Experience" ? workExperiences : education;

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text={sectionTitle} />
      {content.map((experience, index) => (
        <ExperiencesSubsection key={index} experience={experience} />
      ))}
    </Grid>
  );
}
