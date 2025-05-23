import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "@src/components/custom-typography";
import { Grid, Rating } from "@mui/material";
import { useAppSelector } from "../../store/store-helper";
import {
  cvDataSelector,
  styleSelector,
} from "../../store/cv-data/cv-data-slice";

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage(): JSX.Element {
  const { template } = useAppSelector(styleSelector);
  const { skills } = useAppSelector(cvDataSelector);

  return (
    <>
      <SectionTitle text="Skills" />
      {skills.map((skill) => (
        <>
          <SubsectionText
            text={skill.category}
            customSx={{ textAlign: "left" }}
          />
          <Grid
            container
            direction={template === "one-column" ? "row" : "column"}
            alignItems="flex-start"
          >
            {skill.items.map((item) => (
              <Grid container direction="row" alignItems="center">
                <BodyText text={item.name} customSx={{ mr: "10px" }} />
                <Rating value={item.rating} precision={0.5} />
              </Grid>
            ))}
          </Grid>
        </>
      ))}
    </>
  );
}
