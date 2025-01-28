import { Box } from "@mui/material";
import { EducationSection } from "../common/education-section";
import { JSX } from "react";

export function Education(): JSX.Element {
  return (
    <Box>
      <EducationSection
        title={"PhD, Earth Science"}
        institution={"MARUM - University of Bremen"}
        date={"03.2014 - 08.2019"}
        topic={
          "Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas"
        }
      />
      <EducationSection
        title={"M.Sc., Civil and Environmental Engineering"}
        institution={"Amirkabir University of Technology"}
        date={"09.2010 - 02.2013"}
        topic={
          "Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability"
        }
      />
    </Box>
  );
}
