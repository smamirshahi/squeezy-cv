import { Grid } from "@mui/material";
import { SectionTitle } from "../../common/custom-typography";
import { ExperienceSubsection } from "./experience-subsection";
import { cvDataSelector } from "../../store/applicant/applicant-slice";
import { useAppSelector } from "../../store/store-helper";
import { EducationSubsection } from "./education-subsection";

interface Props {
  /** The title of the section */
  sectionTitle: "Education" | "Work Experience";
}

/** Renders the whole experiences part */
export function Experiences({ sectionTitle }: Props): JSX.Element {
  const { experiences, educations } = useAppSelector(cvDataSelector);

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <SectionTitle text={sectionTitle} />
      {sectionTitle === "Work Experience" ? (
        <>
          {experiences.map((experience, index) => (
            <ExperienceSubsection key={index} experience={experience} />
          ))}
        </>
      ) : (
        <>
          {educations.map((education, index) => (
            <EducationSubsection key={index} education={education} />
          ))}
        </>
      )}
    </Grid>
  );
}
